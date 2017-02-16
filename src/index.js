/*!
 * Validate-light
 * v0.1.0
 * (https://github.com/gionatan-lombardi/modal-light)
 * Author: Gionatan Lombardi
 * Free to use, to change, to destroy...
 */

import 'custom-event-polyfill';

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

const defaultParams = {
  validateOnBlur: true,
  validateOnSubmit: true,
  formBlockSelector: '.form__group',
  errorBlockClass: 'form__error-block',
  validClass: 'is-valid',
  invalidClass: 'is-invalid',
};

function builder(el, builderParams) {
  const form = el;

  // Private validation methods

  form.fieldChecks = {

    empty: (value) => {
      value = value.trim();
      const field = {
        hasError: false,
        isEmpty: !value,
        value: value || null,
      };
      return field;
    },

    regExp: (value, r) => {
      const field = form.fieldChecks.empty(value);
      // If value is empty
      if (field.value == null) {
        field.isEmpty = true;
        field.hasError = false;
        return field;
      }
      // Regular expression check
      const regExpResult = r.test(field.value);
      if (!regExpResult) {
        field.hasError = true;
        return field;
      }
      return field;
    },

    email: value => form.fieldChecks.regExp(value, /^([a-zA-Z0-9._-]+[a-zA-Z0-9]@[a-zA-Z0-9-]+\.[a-zA-Z.]{2,5})$/),

    tel: value => form.fieldChecks.regExp(value, /^\+?[0-9\.#\-\(\)\*\/\s]*$/),
  };

  // UI validation elements

  function showError(field, where, msg, cssClass) {
    let errorBlock = where.querySelector(`.${cssClass}`);
    const uniqueClass = field.id ? field.id : field.name ? field.name : '';
    if (errorBlock) {
      errorBlock.classList.remove('is-hidden');
      errorBlock.innerHTML = `<span>${msg}</span>`;
    } else {
      errorBlock = document.createElement('div');
      errorBlock.className = `${cssClass} is-hidden ${cssClass}--${uniqueClass}`;
      errorBlock.innerHTML = `<span>${msg}</span>`;
      where.appendChild(errorBlock);
      // For css transition purposes
      setTimeout(() => {
        errorBlock.classList.remove('is-hidden');
      }, 0);
    }
    return false;
  }

  function hideError(errorContainer, cssClass) {
    const errorBlock = errorContainer.querySelector(`.${cssClass}`);
    if (errorBlock) {
      errorBlock.classList.add('is-hidden');
    }
  }

  // Public Methods

  function validate() {
    form.fields = form.querySelectorAll('input, textarea, select');

    const result = [].every.call(form.fields, (field) => {
      const validationConfig = [
        {
          checkCondition: field.type !== 'checkbox' && field.hasAttribute('required'),
          validationType: form.fieldChecks.empty(field.value).isEmpty,
          msg: form.messages.required,
        },
        {
          checkCondition: field.type === 'email',
          validationType: form.fieldChecks.email(field.value).hasError,
          msg: form.messages.email,
        },
        {
          checkCondition: field.type === 'tel',
          validationType: form.fieldChecks.tel(field.value).hasError,
          msg: form.messages.tel,
        },
        {
          checkCondition: field.type === 'checkbox' && field.hasAttribute('required'),
          validationType: !field.checked,
          msg: form.messages.required,
        },
        {
          checkCondition: field.type === 'radio' && field.hasAttribute('required'),
          validationType: !form.querySelector(`input[name="${field.name}"]:checked`),
          msg: form.messages.required,
        },

      ];

      (function () {
        for (const k in form.customChecks) {
          if (Object.prototype.hasOwnProperty.call(form.customChecks, k)) {
            const dataName = field.getAttribute(`data-validate-${k}`);
            const dataConfig = dataName !== null ? dataName.split(',') : false;
            form.messages[k] = form.getAttribute(`data-msg-${k}`);
            if (!form.messages[k]) {
              throw new Error(`ValidateLight - You must define an error message for your new "${k}" validation rule. Set it on the form tag adding the data-msg-${k} attribute`);
            }
            validationConfig.push({
              checkCondition: !!dataConfig,
              validationType: !dataConfig ? false : form.customChecks[k](field.value, field, dataConfig).isEmpty ? false : form.customChecks[k](field.value, field, dataConfig).hasError,
              msg: form.messages[k],
            });
          }
        }
      }());

      const fieldResult = validationConfig.every((elem) => {
        if (elem.checkCondition) {
          const formGroup = closest(field, builderParams.formBlockSelector);
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
      form.submit();
    }
  }

  function setFieldCheck(name, check) {
    if (typeof name !== 'string' || typeof check === 'undefined') {
      throw new Error('ValidateLight - You must define a string name and a method for your new validation rule');
    }

    if (check instanceof RegExp) {
      form.customChecks[name] = value => form.fieldChecks.regExp(value, check);
    } else if (check instanceof Function) {
      form.customChecks[name] = (value, field, config) => {
        const result = form.fieldChecks.empty(value);
        result.hasError = !check(value, field, config);
        return result;
      };
    } else {
      throw new Error('ValidateLight - Your new validation method is invalid');
    }
  }

  form.setAttribute('novalidate', 'novalidate');

  form.messages = {
    required: form.getAttribute('data-msg-required'),
    email: form.getAttribute('data-msg-email'),
    tel: form.getAttribute('data-msg-tel'),
  };

  form.customChecks = {};

  if (builderParams.validateOnSubmit) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      validate();
    });
  }

  // Stores the plugin public exposed methods and properties, directly in the form HTMLElement
  form.validateLight = {
    validate,
    setFieldCheck: (name, check) => setFieldCheck(name, check),
  };

  // Returns the plugin instance, with the public exposed methods and properties
  return form.validateLight;
}

export default function validateLight(element, customParams) {
  const nodeList = [];
  const forms = [];

  return (function init() {
    // The plugin is called on a single HTMLElement
    if (element && element instanceof HTMLElement && element.tagName.toUpperCase() === 'FORM') {
      nodeList.push(element);
    // The plugin is called on a selector
    } else if (element && typeof element === 'string') {
      const elementsList = document.querySelectorAll(element);
      for (let i = 0, l = elementsList.length; i < l; ++i) {
        if (elementsList[i] instanceof HTMLElement
          && elementsList[i].tagName.toUpperCase() === 'FORM') {
          nodeList.push(elementsList[i]);
        }
      }
    // The plugin is called on any HTMLElements list (NodeList, HTMLCollection, Array, etc.)
    } else if (element && element.length) {
      for (let i = 0, l = element.length; i < l; ++i) {
        if (element[i] instanceof HTMLElement
          && element[i].tagName.toUpperCase() === 'FORM') {
          nodeList.push(element[i]);
        }
      }
    }

    // Launches the plugin over every HTMLElement
    // And stores every plugin instance
    for (let i = 0, l = nodeList.length; i < l; ++i) {
      forms.push(builder(nodeList[i], Object.assign({}, defaultParams, customParams)));
    }

    // Returns all plugin instances
    return forms;
  }());
}
