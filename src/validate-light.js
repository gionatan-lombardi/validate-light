/*!
 * Validate-light
 * v1.0.0
 * (https://github.com/gionatan-lombardi/modal-light)
 * Author: Gionatan Lombardi
 * Free to use, to change, to destroy...
 */

(function(envGlobal) {

'use strict';

// Utility functions

/**
 * forEachNode loops over a DOM NodeList
 * and executes a provided function once per HTML element.
 * @param {NodeList} nodeList - an existing DOM NodeList
 * @param {function} todo - the function to execute once per element
 * @returns {NodeList} the updated NodeList
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/NodeList#Example}
 * @example
 * // returns [li.element-0, li.element-1, li]
 * <ul class="forEachNode">
 *   <li>First</li>
 *   <li>Second</li>
 *   <li>Third</li>
 * </ul>
 * var nodeList1 = document.querySelectorAll('.forEachNode li');
 * var nodeList1 = jVg.forEachNode(nodeList1, function(el, i) {
 *   if (i == 2)
 *     return 'break';
 *   el.classList.add('element-' + i);
 * })
 */
function forEachNode(nodeList, todo) {
  for (var i = 0, l = nodeList.length; i < l; ++i) {
    var el = nodeList[i];
    // The callback takes as params the current element and the index
    var o = todo(el,i);
    // If the callback returns the string "break" the loop'll be stopped
    if ( o === "break") break;
  }
  return nodeList;
}

/**
 * extend takes a list of objects
 * and returns a new one with the objects merged,
 * If it finds properties with the same name, it overwrites the oldest.
 * @param {object} out - a list of objects
 * @returns {object} out - an object with the properties
 * merged or overwritten.
 * @see  {@link http://youmightnotneedjquery.com/#deep_extend}
 * @example
 * // returns {'bar': true, 'baz': [1,2,3], 'foo': 3}
 * jVg.extend({'foo': 2, 'bar': true}, {'foo': 3, 'baz': [1,2,3]})
 */
function extend(out) {
  out = out || {};
  for (var i = 1; i < arguments.length; i++) {
    var obj = arguments[i];
    if (!obj)
      continue;
    for (var key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (typeof obj[key] === 'object')
          out[key] = extend(out[key], obj[key]);
        else
          out[key] = obj[key];
      }
    }
  }
  return out;
}

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
 * jVg.closest(child, '#parent');
 */
function closest(node, selector) {
  var el = node.parentNode;
  if(el && el !== document){
    if((el.matches || el.matchesSelector || el.msMatchesSelector || el.mozMatchesSelector || el.webkitMatchesSelector || el.oMatchesSelector).call(el, selector)){
      return el;
    }else{
      return closest(el, selector);
    }
  }else{
    return null;
  }
}


var buildObj = {

  // Private validation methods

  fieldChecks: {

    empty: function empty(value) {
      var value = value.trim();
      var field = {
        hasError: false,
        isEmpty: value ? false : true,
        value: value ? value : null
      };
      return field;
    },

    regExp: function regExp(value, r) {
      var field = this.empty(value);
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
      return this.regExp(value, /^([a-zA-Z0-9._-]+[a-zA-Z0-9]@[a-zA-Z0-9-]+\.[a-zA-Z.]{2,5})$/)
    },

    tel: function tel(value) {
      return this.regExp(value, /^\+?[0-9\.#\-\(\)\*\/\s]*$/)
    },

  },

  // UI validation elements

  showError: function showError(field, where, msg, cssClass) {
    var errorBlock = where.querySelector('.' + cssClass),
        uniqueClass = field.id ? field.id : field.name ? field.name : "";
    if(errorBlock) {
      errorBlock.classList.remove('is-hidden');
      errorBlock.innerHTML = '<span>' + msg + '</span>';
    } else {
      errorBlock = document.createElement('div');
      errorBlock.className = cssClass + ' is-hidden ' + cssClass + "--" + uniqueClass;
      errorBlock.innerHTML = '<span>' + msg + '</span>';
      where.appendChild(errorBlock);
      // For css transition purposes
      setTimeout(function() {
        errorBlock.classList.remove('is-hidden');
      }, 0)
    }
    return false;
  },

  hideError: function hideError(errorContainer, cssClass) {
    var errorBlock = errorContainer.querySelector('.' + cssClass);
    if(errorBlock)
      errorBlock.classList.add('is-hidden');
  },

  // Public Methods

  validate: function validate() {

    var self = this;

    self.formFields = self.form.querySelectorAll('input, textarea, select');

    var result = true;

    forEachNode(self.formFields, function(field) {

      var validationConfig = [
        {
          checkCondition: field.type != 'checkbox' && field.hasAttribute('required'),
          validationType: self.fieldChecks.empty(field.value).isEmpty,
          msg: self.messages.required
        },
        {
          checkCondition: field.type == 'email',
          validationType: self.fieldChecks.email(field.value).hasError,
          msg: self.messages.email
        },
        {
          checkCondition: field.type == 'tel',
          validationType: self.fieldChecks.tel(field.value).hasError,
          msg: self.messages.tel
        },
        {
          checkCondition: field.type == 'checkbox' && field.hasAttribute('required'),
          validationType: !field.checked,
          msg: self.messages.required
        },
        {
          checkCondition: field.type == 'radio' && field.hasAttribute('required'),
          validationType: !self.form.querySelector('input[name="'+field.name+'"]:checked'),
          msg: self.messages.required
        },

      ];

      (function() {
        for (var k in self.customChecks) {
          var dataName = k.charAt(0).toUpperCase() + k.substr(1).toLowerCase();
          var dataConfig = typeof field.dataset['validate'+dataName] !== "undefined" ? field.dataset['validate'+dataName].split(',') : false ;
          self.messages[k] = self.form.dataset['msg' + dataName];
          if (!self.messages[k])
            throw new Error('ValidateLight - You must define an error message for your new "' + k + '" validation rule. Set it on the form tag adding the data-msg-' + k + ' attribute');
          validationConfig.push({
            checkCondition: dataConfig,
            validationType: !dataConfig ? false : self.customChecks[k](field.value, field, dataConfig).isEmpty ? false : self.customChecks[k](field.value, field, dataConfig).hasError,
            msg: self.messages[k]
          })
        }
      })();

      var fieldResult = validationConfig.every(function(el, i) {

        if (el.checkCondition) {
          var formGroup = closest(field, self.options.formBlockSelector);
          if (el.validationType) {
            field.classList.remove(self.options.validClass);
            field.classList.add(self.options.invalidClass);
            self.showError(field, formGroup, el.msg, 'form__error-block');
            field.dispatchEvent(new Event('validate-light-error'));
            return false;
          } else {
            field.classList.remove('is-invalid');
            if (field.value !== "")
              field.classList.add('is-valid');
            else
              field.classList.remove('is-valid');
            self.hideError(formGroup, 'form__error-block');
            return true;
          }
        } else {
          return true;
        }

      });

      if (fieldResult) {
        result = true;
        return true;
      } else {
        result = false;
        return "break";
      }

    });

    if (result) {
      console.log("SUMBIT!");
      this.form.submit();
    }

  },

  setFieldCheck: function (name, check) {

    var self = this;

    if (typeof name !== "string"  || typeof check === "undefined")
      throw new Error('ValidateLight - You must define a string name and a method for your new validation rule')

    if (check instanceof RegExp) {
      self.customChecks[name] = function(value) {
        return self.fieldChecks.regExp(value, check)
      }
    } else if (check instanceof Function) {
      self.customChecks[name] = function(value, field, config) {
        var result = self.fieldChecks.empty(value)
        result.hasError = !check(value, field, config);
        return result;
      }
    } else {
      throw new Error('ValidateLight - Your new validation method is invalid')
    }

  },

  destroy: function destroy() {

    var self = this;
    // Event Listeners removing
    forEachNode(self.triggers, function (el, i) {
      el.removeEventListener('click', self);
    });

  },

  // Init function
  init: function init(formSelector) {

    var self = this;

    if (typeof formSelector === 'undefined') {
      throw new Error('ValidateLight - You must define a selector')
    }

    self.form = document.querySelector(formSelector);

    self.form.setAttribute('novalidate', 'novalidate');

    self.messages = {
      required: self.form.dataset.msgRequired,
      email : self.form.dataset.msgEmail,
      tel : self.form.dataset.msgTel
    };

    self.customChecks = {};

    if (self.options.validateOnSubmit) {
      self.form.addEventListener('submit', function(e) {
        e.preventDefault();
        self.validate.call(self);
      });
    }

    // Public exposed methods
    return {
      destroy: self.destroy.bind(self),
      validate: self.validate.bind(self),
      setFieldCheck: self.setFieldCheck.bind(self),
    }
  },

};

// The Plugin Function (init)
function validateLight(element, cstOptions) {

  var defaultOptions = {
    validateOnBlur: true,
    validateOnSubmit: true,
    formBlockSelector: '.form__group',
    errorBlockClass: 'form__error-block',
    validClass: 'is-valid',
    invalidClass: 'is-invalid'
  }
  var options = extend(defaultOptions, cstOptions);
  var o = Object.create(buildObj);
  o.options = options;

  return o.init(element);

};

// transport
if ( typeof define === 'function' && define.amd ) {
  // AMD
  define( validateLight );
} else if ( typeof exports === 'object' ) {
  // CommonJS
  module.exports = validateLight;
} else {
  // browser global
  envGlobal.validateLight = validateLight;
}

})( typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {} );
