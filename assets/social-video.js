if (!customElements.get('social-video')) {
  customElements.define(
    'social-video',
    class SocialVideo extends CustomVideo {
      constructor() {
        super();

        this.slider = this.closest('slider-component');
        this.modal = document.getElementById(this.dataset.popupId);
        this.videoWrapper = this.closest('.social-video-wrapper');
        this.muteUnmuteButton = this.videoWrapper?.querySelector('.js-mute-unmute');

        this.scrollObserver = null;
        this.pageScrollObserver = null;
        this.modalObserver = null;
        this.scrollUpdateFrame = null;
        this.scrollToTimeout = null;
        this.scrollEndTimeout = null;
        this.modalCloseTimeout = null;
        this.wasModalOpen = false;

        this.modalContent = this.modal?.querySelector('.popup-modal__content');
        this.previousButton = this.modal?.querySelector('.popup-modal-video-reel__previous');
        this.nextButton = this.modal?.querySelector('.popup-modal-video-reel__next');

        this.handlePointerEnter = this.handlePointerEnter.bind(this);
        this.handleMuteUnmuteClick = this.handleMuteUnmuteClick.bind(this);
        this.handleSlideChanged = this.handleSlideChanged.bind(this);
        this.handleScrollIntersection = this.handleScrollIntersection.bind(this);
        this.handlePageScrollIntersection = this.handlePageScrollIntersection.bind(this);
        this.handlePreviousClick = this.handlePreviousClick.bind(this);
        this.handleNextClick = this.handleNextClick.bind(this);
        this.handleModalScroll = this.handleModalScroll.bind(this);
        this.playCurrentVisibleVideo = this.playCurrentVisibleVideo.bind(this);
        this.handleVideoPlay = this.handleVideoPlay.bind(this);
        this.handleModalStateChange = this.handleModalStateChange.bind(this);
      }

      connectedCallback() {
        if (super.connectedCallback) super.connectedCallback();

        this.wasModalOpen = this.isModalOpen();

        if (this.dataset.hoverAction && !window.themeDevice.isTouchDevice) {
          this.videoWrapper?.addEventListener('pointerenter', this.handlePointerEnter);
        }

        this.video?.addEventListener('play', this.handleVideoPlay);
        this.muteUnmuteButton?.addEventListener('click', this.handleMuteUnmuteClick);
        
        if (!window.themeDevice.isTablet) {
          this.slider?.addEventListener('slideChanged', debounce(this.handleSlideChanged, 50));
        }

        if (window.themeDevice.isMobile || window.themeDevice.isTouchDevice) {
          const video = this.querySelector('video');

          if (video) {
            video.muted = true;
            video.defaultMuted = true;
            video.setAttribute('muted', 'true');
            video.autoplay = true;
            video.setAttribute('autoplay', 'autoplay');
          }

          if (window.themeDevice.isMobile) this.initScrollObserver();
        }

        if (this.isNonPopupVideo() && !window.themeDevice.isTablet) {
          this.initPageScrollObserver();
        }

        if (this.isVideoInPopup()) {
          this.initModalObserver();
        }

        this.initReelNavigation();
        this.updateMuteUnmuteButton();
      }

      disconnectedCallback() {
        if (super.disconnectedCallback) super.disconnectedCallback();

        if (this.dataset.hoverAction && !window.themeDevice.isTouchDevice) {
          this.videoWrapper?.removeEventListener('pointerenter', this.handlePointerEnter);
        }

        this.video?.removeEventListener('play', this.handleVideoPlay);
        this.muteUnmuteButton?.removeEventListener('click', this.handleMuteUnmuteClick);
        this.slider?.removeEventListener('slideChanged', this.handleSlideChanged);

        this.scrollObserver?.disconnect();
        this.pageScrollObserver?.disconnect();
        this.modalObserver?.disconnect();
        this.destroyReelNavigation();

        if (this.scrollUpdateFrame) {
          cancelAnimationFrame(this.scrollUpdateFrame);
        }

        if (this.scrollToTimeout) {
          clearTimeout(this.scrollToTimeout);
        }

        if (this.scrollEndTimeout) {
          clearTimeout(this.scrollEndTimeout);
        }

        if (this.modalCloseTimeout) {
          clearTimeout(this.modalCloseTimeout);
        }
      }

      isModalOpen() {
        if (!this.modal) return false;

        return (
          this.modal.hasAttribute('open') ||
          this.modal.classList.contains('open') ||
          this.modal.classList.contains('active') ||
          this.modal.getAttribute('aria-hidden') === 'false'
        );
      }

      isVideoInPopup() {
        if (!this.video || !this.modalContent) return false;

        return this.modalContent.contains(this.video);
      }

      isNonPopupVideo() {
        return !this.isVideoInPopup();
      }

      hasModalJustBeenClosed() {
        return this.modal?.socialVideoModalJustClosed === true;
      }

      setVideoMuted(muted) {
        if (!this.video) return;

        this.video.muted = muted;
        this.video.defaultMuted = muted;

        if (muted) {
          this.video.setAttribute('muted', 'true');
        } else {
          this.video.removeAttribute('muted');

          if (this.video.volume === 0) {
            this.video.volume = 1;
          }
        }

        this.updateMuteUnmuteButton();
      }

      isGroupSoundEnabled() {
        return this.getVideoGroup().socialVideoSoundEnabled === true;
      }

      setGroupSoundEnabled(enabled) {
        this.getVideoGroup().socialVideoSoundEnabled = enabled;
      }

      updateGroupMuteUnmuteButtons() {
        this.getVideoGroup().querySelectorAll('social-video').forEach((socialVideo) => {
          socialVideo.updateMuteUnmuteButton();
        });
      }

      applyNonPopupPlaybackAudioState() {
        if (!this.video || !this.isNonPopupVideo()) return;

        if (this.hasModalJustBeenClosed()) {
          this.setGroupSoundEnabled(false);
          this.muteAll();
          this.updateGroupMuteUnmuteButtons();
          return;
        }

        if (this.isGroupSoundEnabled()) {
          this.muteAll(this.video);
          this.setVideoMuted(false);
        } else {
          this.setVideoMuted(true);
        }
      }

      restoreVideoAudio() {
        if (!this.video) return;
        this.setVideoMuted(false);
      }

      handleVideoPlay() {
        if (!this.video) return;

        if (this.isNonPopupVideo()) {
          this.applyNonPopupPlaybackAudioState();
          return;
        }

        if (!this.modalContent || !this.isModalOpen()) {
          this.video.pause();
          this.setVideoMuted(true);
          return;
        }

        const isVideoInModal = this.modalContent.contains(this.video);

        if (!isVideoInModal) return;

        this.restoreVideoAudio();
      }

      initScrollObserver() {
        if (!this.modalContent || !this.videoWrapper) return;

        this.scrollObserver = new IntersectionObserver(this.handleScrollIntersection, {
          root: this.modalContent,
          threshold: [0, 0.25, 0.65, 1]
        });

        this.scrollObserver.observe(this.videoWrapper);
      }

      initPageScrollObserver() {
        const group = this.getVideoGroup();

        if (!group || group === document) return;

        this.pageScrollObserver = new IntersectionObserver(this.handlePageScrollIntersection, {
          root: null,
          threshold: [0, 0.05, 0.15, 0.5, 1]
        });

        this.pageScrollObserver.observe(group);
      }

      initModalObserver() {
        if (!this.modal || !this.isVideoInPopup()) return;

        this.modalObserver = new MutationObserver(this.handleModalStateChange);

        this.modalObserver.observe(this.modal, {
          attributes: true,
          attributeFilter: ['open', 'class', 'aria-hidden']
        });

        this.handleModalStateChange();
      }

      handleModalStateChange() {
        if (!this.isVideoInPopup()) return;

        const isOpen = this.isModalOpen();
        const hasJustClosed = this.wasModalOpen && !isOpen;

        this.wasModalOpen = isOpen;

        if (hasJustClosed) {
          this.modal.socialVideoModalJustClosed = true;

          if (this.modalCloseTimeout) {
            clearTimeout(this.modalCloseTimeout);
          }

          this.modalCloseTimeout = setTimeout(() => {
            this.modal.socialVideoModalJustClosed = false;
          }, 500);
        }

        if (!isOpen) {
          this.pausePopupVideos();
        }
      }

      pausePopupVideos() {
        if (!this.modalContent) return;

        this.modalContent.querySelectorAll('social-video').forEach((socialVideo) => {
          if (!socialVideo.video) return;

          socialVideo.video.pause();
          socialVideo.video.muted = true;
          socialVideo.video.defaultMuted = true;
          socialVideo.video.setAttribute('muted', 'true');
          socialVideo.updateMuteUnmuteButton();
        });
      }

      handlePageScrollIntersection(entries) {
        if (!this.video || !this.isNonPopupVideo()) return;

        const entry = entries[0];

        if (!entry.isIntersecting || entry.intersectionRatio <= 0.05) {
          this.setGroupSoundEnabled(false);
          this.muteAll();
          this.updateGroupMuteUnmuteButtons();
        }
      }

      handleScrollIntersection(entries) {
        if (!this.video) return;

        if (this.isVideoInPopup() && !this.isModalOpen()) {
          this.video.pause();
          this.setVideoMuted(true);
          return;
        }

        const entry = entries[0];

        if (entry.isIntersecting && entry.intersectionRatio >= 0.65) {
          this.playActiveVideo();
        } else if (entry.intersectionRatio <= 0.25 && !this.video.paused) {
          this.video.pause();
        }
      }

      playActiveVideo() {
        if (!this.video) return;

        if (this.isVideoInPopup() && !this.isModalOpen()) {
          this.video.pause();
          this.setVideoMuted(true);
          return;
        }

        this.pauseAll(this.video);
        this.muteAll(this.video);

        if (this.isNonPopupVideo()) {
          this.applyNonPopupPlaybackAudioState();
        } else {
          this.restoreVideoAudio();
        }

        this.updateReelButtons();

        const playPromise = this.video.play();

        if (playPromise !== undefined) {
          playPromise.catch(() => {});
        }
      }

      playCurrentVisibleVideo() {
        if (this.isVideoInPopup() && !this.isModalOpen()) return;

        const currentIndex = this.getCurrentVideoIndex();
        const wrappers = this.getVideoWrappers();

        if (currentIndex < 0 || !wrappers[currentIndex]) return;

        const currentSocialVideo = this.getSocialVideoByWrapper(wrappers[currentIndex]);

        if (!currentSocialVideo) return;

        currentSocialVideo.playActiveVideo();
      }

      initReelNavigation() {
        if (!this.modalContent || !this.previousButton || !this.nextButton) return;

        if (this.modalContent.socialVideoReelControlsInitialized) {
          this.updateReelButtons();
          return;
        }

        this.modalContent.socialVideoReelControlsInitialized = true;
        this.modalContent.socialVideoReelControlsOwner = this;

        this.previousButton.addEventListener('click', this.handlePreviousClick);
        this.nextButton.addEventListener('click', this.handleNextClick);
        this.modalContent.addEventListener('scroll', this.handleModalScroll, { passive: true });

        if ('onscrollend' in window) {
          this.modalContent.addEventListener('scrollend', this.playCurrentVisibleVideo);
        }

        this.updateReelButtons();
      }

      destroyReelNavigation() {
        if (!this.modalContent || !this.previousButton || !this.nextButton) return;

        if (this.modalContent.socialVideoReelControlsOwner !== this) return;

        this.previousButton.removeEventListener('click', this.handlePreviousClick);
        this.nextButton.removeEventListener('click', this.handleNextClick);
        this.modalContent.removeEventListener('scroll', this.handleModalScroll);
        this.modalContent.removeEventListener('scrollend', this.playCurrentVisibleVideo);

        delete this.modalContent.socialVideoReelControlsInitialized;
        delete this.modalContent.socialVideoReelControlsOwner;
      }

      getVideoGroup() {
        if (this.isVideoInPopup()) {
          return this.modalContent;
        }

        return this.slider || this.closest('.section-content') || document;
      }

      getVideoWrappers() {
        if (!this.modalContent) return [];

        return [...this.modalContent.querySelectorAll('.social-video-wrapper')];
      }

      getSocialVideoByWrapper(wrapper) {
        return wrapper?.querySelector('social-video') || null;
      }

      getCurrentVideoIndex() {
        if (!this.modalContent) return -1;

        const wrappers = this.getVideoWrappers();

        if (!wrappers.length) return -1;

        const modalRect = this.modalContent.getBoundingClientRect();

        let closestIndex = 0;
        let closestDistance = Infinity;

        wrappers.forEach((wrapper, index) => {
          const wrapperRect = wrapper.getBoundingClientRect();
          const distance = Math.abs(wrapperRect.top - modalRect.top);

          if (distance < closestDistance) {
            closestDistance = distance;
            closestIndex = index;
          }
        });

        return closestIndex;
      }

      scrollToVideoByIndex(index) {
        if (!this.modalContent || !this.isModalOpen()) return;

        const wrappers = this.getVideoWrappers();
        const target = wrappers[index];
        const targetSocialVideo = this.getSocialVideoByWrapper(target);

        if (!target || !targetSocialVideo) return;

        const modalRect = this.modalContent.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();

        this.modalContent.scrollTo({
          top: this.modalContent.scrollTop + targetRect.top - modalRect.top,
          behavior: 'smooth'
        });

        this.updateReelButtons();

        if (this.scrollToTimeout) {
          clearTimeout(this.scrollToTimeout);
        }

        this.scrollToTimeout = setTimeout(() => {
          if (this.isModalOpen()) {
            targetSocialVideo.playActiveVideo();
          }
        }, 350);
      }

      handlePreviousClick(event) {
        event.preventDefault();

        const currentIndex = this.getCurrentVideoIndex();

        if (currentIndex <= 0) return;

        this.scrollToVideoByIndex(currentIndex - 1);
      }

      handleNextClick(event) {
        event.preventDefault();

        const wrappers = this.getVideoWrappers();
        const currentIndex = this.getCurrentVideoIndex();

        if (currentIndex < 0 || currentIndex >= wrappers.length - 1) return;

        this.scrollToVideoByIndex(currentIndex + 1);
      }

      handleModalScroll() {
        if (!this.modalContent || !this.isModalOpen()) return;

        if (!this.scrollUpdateFrame) {
          this.scrollUpdateFrame = requestAnimationFrame(() => {
            this.scrollUpdateFrame = null;
            this.updateReelButtons();
          });
        }

        if (this.scrollEndTimeout) {
          clearTimeout(this.scrollEndTimeout);
        }

        this.scrollEndTimeout = setTimeout(() => {
          if (this.isModalOpen()) {
            this.playCurrentVisibleVideo();
          }
        }, 120);
      }

      updateReelButtons() {
        if (!this.previousButton || !this.nextButton) return;

        const wrappers = this.getVideoWrappers();
        const currentIndex = this.getCurrentVideoIndex();

        this.previousButton.disabled = currentIndex <= 0;
        this.nextButton.disabled = currentIndex < 0 || currentIndex >= wrappers.length - 1;
      }

      pauseAll(exceptThisVideo) {
        this.getVideoGroup().querySelectorAll('social-video').forEach((socialVideo) => {
          if (
            socialVideo !== this &&
            socialVideo.video &&
            socialVideo.video !== exceptThisVideo &&
            !socialVideo.video.paused
          ) {
            socialVideo.video.pause();
          }
        });
      }

      muteAll(exceptThisVideo) {
        this.getVideoGroup().querySelectorAll('social-video').forEach((socialVideo) => {
          if (socialVideo.video && socialVideo.video !== exceptThisVideo) {
            socialVideo.video.muted = true;
            socialVideo.video.defaultMuted = true;
            socialVideo.video.setAttribute('muted', 'true');
            socialVideo.updateMuteUnmuteButton();
          }
        });
      }

      updateMuteUnmuteButton() {
        if (!this.video || !this.muteUnmuteButton) return;

        this.muteUnmuteButton.dataset.volume = this.video.muted ? 'muted' : 'unmuted';
      }

      handleMuteUnmuteClick(event) {
        event.preventDefault();

        if (!this.video) return;

        if (this.isNonPopupVideo()) {
          const shouldMute = !this.video.muted;

          if (shouldMute) {
            this.setGroupSoundEnabled(false);
            this.muteAll();
            this.setVideoMuted(true);
          } else {
            this.setGroupSoundEnabled(true);
            this.muteAll(this.video);
            this.setVideoMuted(false);
          }

          this.updateGroupMuteUnmuteButtons();
          return;
        }

        this.muteAll(this.video);
        this.setVideoMuted(!this.video.muted);
      }

      handleSlideChanged(event) {
        if (!window.themeDevice.isMobile || !this.video) return;

        const currentElement = event.detail?.currentElement;

        if (!currentElement || !currentElement.contains(this)) return;

        this.pauseAll(this.video);
        this.muteAll(this.video);

        if (this.isNonPopupVideo()) {
          this.applyNonPopupPlaybackAudioState();
        } else {
          this.setVideoMuted(true);
        }

        const playPromise = this.video.play();

        if (playPromise !== undefined) {
          playPromise.catch(() => {});
        }
      }

      handlePointerEnter() {
        if (!this.video) return;

        if (this.isNonPopupVideo()) {
          this.applyNonPopupPlaybackAudioState();
        }

        if (this.dataset.hoverAction === 'play_one_at_a_time') {
          this.pauseAll(this.video);

          const playPromise = this.video.play();

          if (playPromise !== undefined) {
            playPromise.catch(() => {});
          }
        } else if (this.dataset.hoverAction === 'play' && this.video.paused) {
          const playPromise = this.video.play();

          if (playPromise !== undefined) {
            playPromise.catch(() => {});
          }
        }
      }

      playPause() {
        this.pauseAll();
        super.playPause();
      }
    }
  );
}