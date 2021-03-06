/**
 * Automatically tracks DOM components with proper data-attributes
 *
 * - data-ddl-viewed-product="<product.id>"
 * - data-ddl-viewed-campaign="<campaign.id>"
 * - data-ddl-clicked-product="<product.id>"
 * - data-ddl-clicked-campaign="<campaign.id>"
 * - data-ddl-product-list-name="<listId>"
 *
 * If any DOM components are added to the page dynamically
 * corresponding digitalData variable should be updated:
 * digitalData.list, digitalData.recommendation or digitalData.campaigns
 */
class DOMComponentsTracking
{
  constructor(options) {
    this.options = Object.assign({
      websiteMaxWidth: undefined,
    }, options);

    this.viewedComponentIds = {
      product: [],
      campaign: [],
    };

    this.$digitalDataComponents = {
      product: [],
      campaign: [],
    };
  }

  initialize() {
    if (!window.jQuery) {
      return;
    }
    window.jQuery(() => {
      // detect max website width
      if (!this.options.websiteMaxWidth) {
        const $body = window.jQuery('body');
        this.options.websiteMaxWidth =
            $body.children('.container').first().width() ||
            $body.children('div').first().width();
      }

      this.defineDocBoundaries();
      this.addClickHandlers();
      this.startTracking();
    });
  }

  defineDocBoundaries() {
    const $window = window.jQuery(window);

    const _defineDocBoundaries = () => {
      this.docViewTop = $window.scrollTop();
      this.docViewBottom = this.docViewTop + $window.height();
      this.docViewLeft = $window.scrollLeft();
      this.docViewRight = this.docViewLeft + $window.width();

      const maxWebsiteWidth = this.options.maxWebsiteWidth;
      if (maxWebsiteWidth && maxWebsiteWidth < this.docViewRight && this.docViewLeft === 0) {
        this.docViewLeft = (this.docViewRight - maxWebsiteWidth) / 2;
        this.docViewRight = this.docViewLeft + maxWebsiteWidth;
      }
    };

    _defineDocBoundaries();
    $window.resize(() => {
      _defineDocBoundaries();
    });
    $window.scroll(() => {
      _defineDocBoundaries();
    });
  }

  updateDigitalDataDomComponents() {
    for (const type of ['product', 'campaign']) {
      const viewedSelector = 'ddl-viewed-' + type;
      this.$digitalDataComponents[type] = this.findByDataAttr(viewedSelector);
    }
  }

  addClickHandlers() {
    const onClick = (type) => {
      const self = this;
      return function onClickHandler() {
        const $el = window.jQuery(this);
        const id = $el.data('ddl-clicked-' + type);
        if (type === 'product') {
          const listId = self.findParentByDataAttr('ddl-product-list-name', $el).data('ddl-product-list-name');
          self.fireClickedProduct(id, listId);
        } else if (type === 'campaign') {
          self.fireClickedCampaign(id);
        }
      };
    };

    for (const type of ['campaign', 'product']) {
      const eventName = 'click.ddl-clicked-' + type;
      const selector = this.getDataAttrSelector('ddl-clicked-' + type);
      window.jQuery(document).on(eventName, selector, onClick(type));
    }
  }

  trackViews() {
    for (const type of ['campaign', 'product']) {
      const newViewedComponents = [];
      const $components = this.$digitalDataComponents[type];
      $components.each((index, el) => { // eslint-disable-line no-loop-func
        const $el = window.jQuery(el);
        const id = $el.data('ddl-viewed-' + type);
        if (this.viewedComponentIds[type].indexOf(id) < 0 && this.isVisible($el)) {
          this.viewedComponentIds[type].push(id);
          if (type === 'product') {
            const listItem = {
              product: { id },
            };
            const listId = this.findParentByDataAttr('ddl-product-list-name', $el).data('ddl-product-list-name');
            if (listId) listItem.listId = listId;
            newViewedComponents.push(listItem);
          } else {
            newViewedComponents.push(id);
          }
        }
      });

      if (newViewedComponents.length > 0) {
        if (type === 'product') {
          this.fireViewedProduct(newViewedComponents);
        } else if (type === 'campaign') {
          this.fireViewedCampaign(newViewedComponents);
        }
      }
    }
  }

  startTracking() {
    const _track = () => {
      this.updateDigitalDataDomComponents();
      this.trackViews();
    };

    _track();
    setInterval(() => {
      _track();
    }, 500);
  }

  fireViewedProduct(listItems) {
    window.digitalData.events.push({
      name: 'Viewed Product',
      category: 'Ecommerce',
      listItems,
    });
  }

  fireViewedCampaign(campaigns) {
    window.digitalData.events.push({
      name: 'Viewed Campaign',
      category: 'Promo',
      campaigns,
    });
  }

  fireClickedProduct(productId, listId) {
    const listItem = {
      product: {
        id: productId,
      },
    };
    if (listId) listItem.listId = listId;
    window.digitalData.events.push({
      name: 'Clicked Product',
      category: 'Ecommerce',
      listItem,
    });
  }

  fireClickedCampaign(campaign) {
    window.digitalData.events.push({
      name: 'Clicked Campaign',
      category: 'Promo',
      campaign,
    });
  }

  /**
   * Returns true if element is visible by css
   * and at least 3/4 of the element fit user viewport
   *
   * @param $elem JQuery object
   * @returns boolean
   */
  isVisible($elem) {
    const el = $elem[0];
    const $window = window.jQuery(window);

    const elemOffset = $elem.offset();
    const elemWidth = $elem.width();
    const elemHeight = $elem.height();

    const elemTop = elemOffset.top;
    const elemBottom = elemTop + elemHeight;
    const elemLeft = elemOffset.left;
    const elemRight = elemLeft + elemWidth;

    const visible = $elem.is(':visible') && $elem.css('opacity') > 0 && $elem.css('visibility') !== 'hidden';
    if (!visible) {
      return false;
    }

    const fitsVertical = (
      ((elemBottom - elemHeight / 4) <= this.docViewBottom) &&
      ((elemTop + elemHeight / 4) >= this.docViewTop)
    );
    const fitsHorizontal = (
      (elemLeft + elemWidth / 4 >= this.docViewLeft) &&
      (elemRight - elemWidth / 4 <= this.docViewRight)
    );

    if (!fitsVertical || !fitsHorizontal) {
      return false;
    }

    let elementFromPoint = document.elementFromPoint(
        elemLeft - $window.scrollLeft() + elemWidth / 2,
        elemTop - $window.scrollTop() + elemHeight / 2
    );

    while (elementFromPoint && elementFromPoint !== el && elementFromPoint.parentNode !== document) {
      elementFromPoint = elementFromPoint.parentNode;
    }

    return (!!elementFromPoint && elementFromPoint === el);
  }


  /**
   * Find elements by data attribute name
   *
   * @param name
   * @param obj
   * @returns jQuery object
   */
  findByDataAttr(name, obj) {
    if (!obj) obj = window.jQuery(document.body);
    return obj.find(this.getDataAttrSelector(name));
  }

  /**
   * Find parent element by data attribute name
   *
   * @param name
   * @param obj
   * @returns jQuery object
   */
  findParentByDataAttr(name, obj) {
    return obj.closest(this.getDataAttrSelector(name));
  }

  getDataAttrSelector(name) {
    return '[data-' + name + ']';
  }
}

export default DOMComponentsTracking;
