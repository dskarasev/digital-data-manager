import assert from 'assert';
import sinon from 'sinon';
import reset from './../reset';
import Emarsys from './../../src/integrations/Emarsys';
import ddManager from './../../src/ddManager';

function viewedPage(callback, page = {}) {
  window.digitalData.events.push({
    name: 'Viewed Page',
    category: 'Content',
    page,
    callback,
  });
}

function viewedPageOfType(type, callback) {
  viewedPage(callback, { type });
}

function viewedProductCategory(category, callback) {
  window.digitalData.events.push({
    name: 'Viewed Product Category',
    category: 'Ecommerce',
    listing: { category },
    callback,
  });
}

function searched(query, callback) {
  window.digitalData.events.push({
    name: 'Searched Products',
    category: 'Content',
    listing: { query },
    callback,
  })
}

function viewedProductDetail(productId, callback) {
  window.digitalData.events.push({
    name: 'Viewed Product Detail',
    category: 'Ecommerce',
    product: {
      id: productId
    },
    callback,
  });
}

function completedTransaction(transaction, callback) {
  window.digitalData.events.push({
    name: 'Completed Transaction',
    category: 'Ecommerce',
    transaction,
    callback,
  })
}

describe('Integrations: Emarsys', () => {

  let emarsys;
  const options = {
    merchantId: '1ED4C63984B56E58',
  };

  beforeEach(() => {
    window.digitalData = {
      website: {},
      page: {},
      user: {},
      events: []
    };
    emarsys = new Emarsys(window.digitalData, options);
    ddManager.addIntegration('Emarsys', emarsys);
  });

  afterEach(() => {
    emarsys.reset();
    ddManager.reset();
    reset();
  });

  describe('before loading', () => {
    beforeEach(function () {
      sinon.stub(emarsys, 'load');
    });

    afterEach(function () {
      emarsys.load.restore();
    });

    describe('#constructor', () => {
      it('should add proper tags and options', () => {
        assert.equal(options.merchantId, emarsys.getOption('merchantId'));
        assert.equal('script', emarsys.getTag().type);
        assert.equal(emarsys.getTag().attr.src, `//recommender.scarabresearch.com/js/${options.merchantId}/scarab-v2.js`);
      });
    });

    describe('#initialize', () => {
      it('should initialize emarsys queue object', () => {
        ddManager.initialize();
        assert.ok(window.ScarabQueue);
        assert.ok(window.ScarabQueue.push);
      });

      it('should call tags load after initialization', () => {
        ddManager.initialize();
        assert.ok(emarsys.load.calledOnce);
      });
    });
  });

  describe('loading', function () {
    beforeEach(() => {
      sinon.stub(emarsys, 'load', () => {
        window.ScarabQueue = {
          push: function() {},
        };
        emarsys.onLoad();
      });
    });

    afterEach(() => {
      emarsys.load.restore();
    });

    it('should load', function (done) {
      assert.ok(!emarsys.isLoaded());
      ddManager.once('load', () => {
        assert.ok(emarsys.isLoaded());
        done();
      });
      ddManager.initialize({
        autoEvents: false
      });
    });
  });

  describe('after loading', () => {
    beforeEach((done) => {
      sinon.stub(emarsys, 'load', () => {
        sinon.spy(window.ScarabQueue, 'push')
        emarsys.onLoad();
      });
      ddManager.once('ready', done);
      ddManager.initialize({
        autoEvents: false
      });
    });

    afterEach(function () {
      emarsys.load.restore();
      window.ScarabQueue.push.restore();
    });

    describe('#onViewedPage', () => {
      it('should send email if user.email is defined', (done) => {
        window.digitalData.user = {
          email: 'test@driveback.ru'
        };
        viewedPage(() => {
          assert.ok(window.ScarabQueue.push.calledWith(['setEmail', 'test@driveback.ru']));
          done();
        });
      });

      it('should not send email if user.email is not defined', (done) => {
        viewedPage(() => {
          assert.ok(!window.ScarabQueue.push.calledWith(['setEmail', sinon.match.any]));
          done();
        });
      });

      it('should send customerId if user.userId is defined', (done) => {
        window.digitalData.user = {
          userId: '123'
        };
        viewedPage(() => {
          assert.ok(window.ScarabQueue.push.calledWith(['setCustomerId', '123']));
          done();
        });
      });

      it('should not send customerId if user.email is defined', (done) => {
        window.digitalData.user = {
          userId: '123',
          email: 'test@driveback.ru',
        };
        viewedPage(() => {
          assert.ok(!window.ScarabQueue.push.calledWith(['setCustomerId', sinon.match.any]));
          assert.ok(window.ScarabQueue.push.calledWith(['setEmail', 'test@driveback.ru']));
          done();
        });
      });

      it('should always send cart even if cart is empty', (done) => {
        viewedPage(() => {
          assert.ok(window.ScarabQueue.push.calledWith(['cart', []]));
          done();
        });
      });

      it('should send cart info', (done) => {
        window.digitalData.cart = {
          lineItems: [
            {
              product: {
                id: '123',
                unitSalePrice: 100
              },
              quantity: 2,
              subtotal: 180
            },
            {
              product: {
                id: '234',
                unitSalePrice: 100
              },
              quantity: 2
            }
          ]
        };
        viewedPage(() => {
          assert.ok(window.ScarabQueue.push.calledWith(['cart', [
            {
              item: '123',
              price: 180,
              quantity: 2
            },
            {
              item: '234',
              price: 200,
              quantity: 2
            }
          ]]));
          done();
        });
      });

      it('should not send "go" for page.type = product', (done) => {
        viewedPageOfType('product', () => {
          assert.ok(!window.ScarabQueue.push.calledWith(['go']));
          done();
        });
      });

      it('should not send "go" for page.type = category', (done) => {
        viewedPageOfType('category', () => {
          assert.ok(!window.ScarabQueue.push.calledWith(['go']));
          done();
        });
      });

      it('should not send "go" for page.type = search', (done) => {
        viewedPageOfType('search', () => {
          assert.ok(!window.ScarabQueue.push.calledWith(['go']));
          done();
        });
      });

      it('should not send "go" for page.type = confirmation', (done) => {
        viewedPageOfType('confirmation', () => {
          assert.ok(!window.ScarabQueue.push.calledWith(['go']));
          done();
        });
      });

      it('should send "go" for any other page', (done) => {
        viewedPageOfType('home', () => {
          assert.ok(window.ScarabQueue.push.calledWith(['go']));
          done();
        });
      });
    });

    describe('#onViewedProductCategory', () => {
      it('should send category with default separator', (done) => {
        viewedProductCategory(['Category', 'Subcategory 1', 'Subcategory 2'], () => {
          assert.ok(window.ScarabQueue.push.calledWith(['category', 'Category > Subcategory 1 > Subcategory 2']));
          done();
        });
      });

      it('should send "category" with custom separator', (done) => {
        emarsys.setOption('categorySeparator', ' / ');
        viewedProductCategory(['Category', 'Subcategory 1', 'Subcategory 2'], () => {
          assert.ok(window.ScarabQueue.push.calledWith(['category', 'Category / Subcategory 1 / Subcategory 2']));
          done();
        });
      });

      it('should send "category" without separator', (done) => {
        emarsys.setOption('categorySeparator', ' / ');
        viewedProductCategory('Category 1', () => {
          assert.ok(window.ScarabQueue.push.calledWith(['category', 'Category 1']));
          done();
        });
      });

      it('should send "go"', (done) => {
        viewedProductCategory(['Category', 'Subcategory 1', 'Subcategory 2'], () => {
          assert.ok(window.ScarabQueue.push.calledWith(['go']));
          done();
        });
      });
    });

    describe('#onViewedProductDetail', () => {
      it('should send "view"', (done) => {
        viewedProductDetail('123', () => {
          assert.ok(window.ScarabQueue.push.calledWith(['view', '123']));
          done();
        });
      });

      it('should send "go"', (done) => {
        viewedProductDetail('123', () => {
          assert.ok(window.ScarabQueue.push.calledWith(['view', '123']));
          done();
        });
      });
    });

    describe('#onSearched', () => {
      it('should send "searchTerm"', (done) => {
        searched('test query', () => {
          assert.ok(window.ScarabQueue.push.calledWith(['searchTerm', 'test query']));
          done();
        })
      });

      it('should send "go"', (done) => {
        searched('test query', () => {
          assert.ok(window.ScarabQueue.push.calledWith(['go']));
          done();
        });
      });
    });

    describe('#onCompletedTransaction', () => {
      it('should send "purchase" and "go"', (done) => {
        completedTransaction({
          orderId: '123',
          lineItems: [
            {
              product: {
                id: '123',
                unitSalePrice: 100
              },
              quantity: 2,
              subtotal: 180
            },
            {
              product: {
                id: '234',
                unitSalePrice: 100
              },
              quantity: 2
            }
          ]
        }, () => {
          assert.ok(window.ScarabQueue.push.calledWith(['purchase', {
            orderId: '123',
            items: [
              {
                item: '123',
                price: 180,
                quantity: 2
              },
              {
                item: '234',
                price: 200,
                quantity: 2
              }
            ]
          }]));
          assert.ok(window.ScarabQueue.push.calledWith(['go']));
          done();
        })
      });
    });
  });
});
