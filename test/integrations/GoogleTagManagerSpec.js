import assert from 'assert';
import reset from './../reset.js';
import GoogleTagManager from './../../src/integrations/GoogleTagManager.js';
import ddManager from './../../src/ddManager.js';

describe('Integrations: GoogleTagManager', () => {
  describe('using containerID', () => {

    let gtm;
    const options = {
      containerId: 'GTM-M9CMLZ'
    };

    beforeEach(() => {
      gtm = new GoogleTagManager(window.digitalData, options);
      ddManager.addIntegration('Google Tag Manager', gtm);
    });

    afterEach(() => {
      gtm.reset();
      ddManager.reset();
      reset();
    });

    describe('#constructor', () => {

      it('should create GTM integrations with proper options and tags', () => {
        assert.equal(options.containerId, gtm.getOption('containerId'));
        assert.equal('script', gtm.getTag().type);
        assert.ok(gtm.getTag().attr.src.indexOf(options.containerId) > 0);
      });

    });

    describe('#load', () => {

      it('should load', (done) => {
        assert.ok(!gtm.isLoaded());
        ddManager.once('load', () => {
          assert.ok(gtm.isLoaded());
          done();
        });
        ddManager.initialize();
      });

      it('should not load if gtm is already loaded', (done) => {
        const originalIsLoaded = gtm.isLoaded;
        gtm.isLoaded = () => {
          return true;
        };
        assert.ok(gtm.isLoaded());
        ddManager.once('ready', () => {
          assert.ok(!originalIsLoaded());
          done();
        });
        ddManager.initialize();
      });

    });

    describe('after loading', () => {
      beforeEach((done) => {
        ddManager.once('load', done);
        ddManager.initialize({
          autoEvents: false
        });
      });

      it('should update dataLayer', (done) => {
        let dl = window.dataLayer;
        assert.ok(dl);
        setTimeout(() => {
          assert.ok(dl[0].event === 'gtm.js');
          assert.ok(typeof dl[0]['gtm.start'] === 'number');
          assert.ok(dl[1].event === 'DDManager Ready');
          assert.ok(dl[2].event === 'gtm.dom');
          assert.ok(dl[3].event === 'gtm.load');
          assert.ok(dl[4].event === 'DDManager Loaded');
          done();
        }, 10);
      });

      describe('#trackEvent', () => {

        beforeEach(() => {
          window.dataLayer = [];
        });

        it('should send event', () => {
          window.digitalData.events.push({
            name: 'some-event',
            category: 'some-category'
          });

          let dl = window.dataLayer;

          assert.ok(dl[0].event === 'some-event');
          assert.ok(dl[0].eventCategory === 'some-category');
        });

        it('should send event with additional parameters', () => {
          window.digitalData.events.push({
            name: 'some-event',
            category: 'some-category',
            additionalParam: true
          });

          let dl = window.dataLayer;

          assert.ok(dl[0].event === 'some-event');
          assert.ok(dl[0].additionalParam === true);
        });

      });
    });

  });

  describe('using existing GTM', () => {

    let gtm;

    beforeEach(() => {
      window.dataLayer = [];
      // window.dataLayer.push = function() {
      //   window.dataLayer.prototype.apply(this,arguments);
      // };
      gtm = new GoogleTagManager(window.digitalData, {
        noConflict: true
      });
      ddManager.addIntegration('Google Tag Manager', gtm);
    });

    afterEach(() => {
      gtm.reset();
      ddManager.reset();
      reset();
    });

    describe('after loading', () => {
      beforeEach((done) => {
        ddManager.once('ready', done);
        ddManager.initialize({
          autoEvents: false
        });
      });

      describe('#trackEvent', () => {

        it('should send event with additional parameters to existing GTM', () => {
          window.digitalData.events.push({
            name: 'some-event',
            category: 'some-category',
            additionalParam: true
          });

          let dl = window.dataLayer;

          assert.ok(dl[2].event === 'some-event');
          assert.ok(dl[2].additionalParam === true);
        });

      });
    });
  });

});
