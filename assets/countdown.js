if (!customElements.get('custom-countdown')) {
  class CustomCountdown extends HTMLElement {
    constructor() {
      super();
      window.initScriptOnDemand(this, this.init.bind(this));

      if (this.dataset.loading === 'eager') {
        this.init();
      }
    }

    init() {
      this.endDate = new Date(this.dataset.endDate).getTime();
      if (!Number(this.endDate)) return;

      this.secondsElem = this.querySelector('.js-seconds');
      this.minutesElem = this.querySelector('.js-minutes');
      this.hoursElem = this.querySelector('.js-hours');
      this.daysElem = this.querySelector('.js-days');

      this.seconds = 1000;
      this.minutes = this.seconds * 60;
      this.hours = this.minutes * 60;
      this.days = this.hours * 24;

      this.nextTick();
      this.intervalTimer = setInterval(this.nextTick.bind(this), this.seconds);
    }

    nextTick() {
      const remaining = this.endDate - new Date();
      if (remaining < 0) {
        clearInterval(this.intervalTimer);
        return;
      }

      const days = Math.floor(remaining / this.days);
      const hours = Math.floor(remaining / this.hours);
      const minutes = Math.floor(remaining / this.minutes);
      const secs = Math.floor(remaining / this.seconds);

      if (days === 0 && this.daysElem) {
        this.daysElem.closest('.countdown__block').remove();
        this.daysElem = null;

        if (this.hoursElem && (hours - days * 24) === 0) {
          this.hoursElem.closest('.countdown__block').remove();
          this.hoursElem = null;
        }
      }

      let digits = 2;
      const remainingDays = days;
      const remainingHours = hours - days * 24;
      const remainingMinutes = minutes - hours * 60;
      const remainingSecs = secs - minutes * 60;

      if (this.daysElem) {
        this.daysElem.textContent = remainingDays  < 10 ? `0${remainingDays}` : remainingDays;
        digits++;
      }

      if (this.hoursElem) {
        this.hoursElem.textContent = remainingHours  < 10 ? `0${remainingHours}` : remainingHours;
        digits++;
      }

      this.minutesElem.textContent = remainingMinutes  < 10 ? `0${remainingMinutes}` : remainingMinutes;
      this.secondsElem.textContent = remainingSecs  < 10 ? `0${remainingSecs}` : remainingSecs;

      this.setAttribute('data-digits', digits);
    }
  }

  customElements.define('custom-countdown', CustomCountdown);
}
