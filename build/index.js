'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; /*!
                                                                                                                                                                                                                                                                   * Validate-light
                                                                                                                                                                                                                                                                   * v0.1.1
                                                                                                                                                                                                                                                                   * (https://github.com/gionatan-lombardi/modal-light)
                                                                                                                                                                                                                                                                   * Author: Gionatan Lombardi
                                                                                                                                                                                                                                                                   * Free to use, to change, to destroy...
                                                                                                                                                                                                                                                                   */

exports.default = validateLight;

require('custom-event-polyfill');

// Utility functions

/**
 * closest gets the closest parent that has the specified selector
 * @param {HTMLelement} node - an existing DOM node
 * @param {string} selector - the selector to match
 * @returns {HTMLelement||null} the closest parent node
 * that matches the selector or null if no one matches
 * @example
 * // returns [<div id="parent"><p class="child">I'm a 👶 of a 👨</p></div>]
 * <div id="parent"><p class="child">I'm a 👶 of a 👨</p></div>
 * var child = document.querySelector('.child');
 * closest(child, '#parent');
 */
function closest(node, selector) {
  var el = node.parentNode;
  if (el && el !== document) {
    if ((el.matches || el.matchesSelector || el.msMatchesSelector || el.mozMatchesSelector || el.webkitMatchesSelector || el.oMatchesSelector).call(el, selector)) {
      return el;
    }
    return closest(el, selector);
  }
  return null;
}

var defaultParams = {
  validateOnBlur: true,
  validateOnSubmit: true,
  formBlockSelector: '.form__group',
  errorBlockClass: 'form__error-block',
  validClass: 'is-valid',
  invalidClass: 'is-invalid'
};

function builder(el, builderParams) {
  var form = el;
  var fields = form.querySelectorAll('input, textarea, select');
  var messages = {
    required: form.getAttribute('data-msg-required'),
    email: form.getAttribute('data-msg-email'),
    tel: form.getAttribute('data-msg-tel')
  };
  var customChecks = {};

  form.setAttribute('novalidate', 'novalidate');

  // Private validation methods

  var fieldChecks = {

    empty: function empty(value) {
      value = value.trim();
      var field = {
        hasError: false,
        isEmpty: !value,
        value: value || null
      };
      return field;
    },

    regExp: function regExp(value, r) {
      var field = fieldChecks.empty(value);
      // If value is empty
      if (field.value == null) {
        field.isEmpty = true;
        field.hasError = false;
        return field;
      }
      // Regular expression check
      var regExpResult = r.test(field.value);
      if (!regExpResult) {
        field.hasError = true;
        return field;
      }
      return field;
    },

    email: function email(value) {
      return fieldChecks.regExp(value, /^([a-zA-Z0-9._-]+[a-zA-Z0-9]@[a-zA-Z0-9-]+\.[a-zA-Z.]{2,5})$/);
    },

    tel: function tel(value) {
      return fieldChecks.regExp(value, /^\+?[0-9\.#\-\(\)\*\/\s]*$/);
    }
  };

  // Public Methods

  function showError(field, where, msg, cssClass) {
    var errorBlock = where.querySelector('.' + cssClass);
    var uniqueClass = field.id ? field.id : field.name ? field.name : '';
    if (errorBlock) {
      errorBlock.classList.remove('is-hidden');
      errorBlock.innerHTML = '<span>' + msg + '</span>';
    } else {
      errorBlock = document.createElement('div');
      errorBlock.className = cssClass + ' is-hidden ' + cssClass + '--' + uniqueClass;
      errorBlock.innerHTML = '<span>' + msg + '</span>';
      where.appendChild(errorBlock);
      // For css transition purposes
      setTimeout(function () {
        errorBlock.classList.remove('is-hidden');
      }, 0);
    }
    return false;
  }

  function hideError(errorContainer, cssClass) {
    var errorBlock = errorContainer.querySelector('.' + cssClass);
    if (errorBlock) {
      errorBlock.classList.add('is-hidden');
    }
  }

  function validate() {
    var result = [].every.call(fields, function (field) {
      var validationConfig = [{
        checkCondition: field.type !== 'checkbox' && field.hasAttribute('required'),
        validationType: fieldChecks.empty(field.value).isEmpty,
        msg: messages.required
      }, {
        checkCondition: field.type === 'email',
        validationType: fieldChecks.email(field.value).hasError,
        msg: messages.email
      }, {
        checkCondition: field.type === 'tel',
        validationType: fieldChecks.tel(field.value).hasError,
        msg: messages.tel
      }, {
        checkCondition: field.type === 'checkbox' && field.hasAttribute('required'),
        validationType: !field.checked,
        msg: messages.required
      }, {
        checkCondition: field.type === 'radio' && field.hasAttribute('required'),
        validationType: !form.querySelector('input[name="' + field.name + '"]:checked'),
        msg: messages.required
      }];

      (function () {
        for (var k in customChecks) {
          if (Object.prototype.hasOwnProperty.call(customChecks, k)) {
            var dataName = field.getAttribute('data-validate-' + k);
            var dataConfig = dataName !== null ? dataName.split(',') : false;
            messages[k] = form.getAttribute('data-msg-' + k);
            if (!messages[k]) {
              throw new Error('ValidateLight - You must define an error message for your new "' + k + '" validation rule. Set it on the form tag adding the data-msg-' + k + ' attribute');
            }
            validationConfig.push({
              checkCondition: !!dataConfig,
              validationType: !dataConfig ? false : customChecks[k](field.value, field, dataConfig).isEmpty ? false : customChecks[k](field.value, field, dataConfig).hasError,
              msg: messages[k]
            });
          }
        }
      })();

      var fieldResult = validationConfig.every(function (elem) {
        if (elem.checkCondition) {
          var formGroup = closest(field, builderParams.formBlockSelector);
          if (elem.validationType) {
            field.classList.remove(builderParams.validClass);
            field.classList.add(builderParams.invalidClass);
            showError(field, formGroup, elem.msg, 'form__error-block');
            field.dispatchEvent(new CustomEvent('validate-light:error'));
            return false;
          }
          field.classList.remove('is-invalid');
          if (field.value !== '') {
            field.classList.add('is-valid');
          } else {
            field.classList.remove('is-valid');
          }
          hideError(formGroup, 'form__error-block');
          return true;
        }
        return true;
      });

      return fieldResult;
    });

    if (result) {
      console.log(form);
      form.submit();
    }
  }

  function _setFieldCheck(name, check) {
    if (typeof name !== 'string' || typeof check === 'undefined') {
      throw new Error('ValidateLight - You must define a string name and a method for your new validation rule');
    }

    if (check instanceof RegExp) {
      customChecks[name] = function (value) {
        return fieldChecks.regExp(value, check);
      };
    } else if (check instanceof Function) {
      customChecks[name] = function (value, field, config) {
        var result = fieldChecks.empty(value);
        result.hasError = !check(value, field, config);
        return result;
      };
    } else {
      throw new Error('ValidateLight - Your new validation method is invalid');
    }
  }

  if (builderParams.validateOnSubmit) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      validate();
    });
  }

  // Stores the plugin public exposed methods and properties, directly in the form HTMLElement
  form.validateLight = {
    fields: fields,
    validate: validate,
    showError: showError,
    hideError: hideError,
    setFieldCheck: function setFieldCheck(name, check) {
      return _setFieldCheck(name, check);
    }
  };

  // Returns the plugin instance, with the public exposed methods and properties
  return form.validateLight;
}

function validateLight(element, customParams) {
  var nodeList = [];
  var forms = [];

  return function init() {
    // The plugin is called on a single HTMLElement
    if (element && element instanceof HTMLElement && element.tagName.toUpperCase() === 'FORM') {
      nodeList.push(element);
      // The plugin is called on a selector
    } else if (element && typeof element === 'string') {
      var elementsList = document.querySelectorAll(element);
      for (var i = 0, l = elementsList.length; i < l; ++i) {
        if (elementsList[i] instanceof HTMLElement && elementsList[i].tagName.toUpperCase() === 'FORM') {
          nodeList.push(elementsList[i]);
        }
      }
      // The plugin is called on any HTMLElements list (NodeList, HTMLCollection, Array, etc.)
    } else if (element && element.length) {
      for (var _i = 0, _l = element.length; _i < _l; ++_i) {
        if (element[_i] instanceof HTMLElement && element[_i].tagName.toUpperCase() === 'FORM') {
          nodeList.push(element[_i]);
        }
      }
    }

    // Launches the plugin over every HTMLElement
    // And stores every plugin instance
    for (var _i2 = 0, _l2 = nodeList.length; _i2 < _l2; ++_i2) {
      forms.push(builder(nodeList[_i2], _extends({}, defaultParams, customParams)));
    }

    // Returns all plugin instances
    return forms;
  }();
}

//# sourceMappingURL=index.js.map