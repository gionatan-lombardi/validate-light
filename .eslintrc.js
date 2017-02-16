module.exports = {
    "extends": "airbnb",
    "env": {
      "browser": true
    },
    "plugins": [
        "react",
        "jsx-a11y",
        "import"
    ],
    "rules": {
      "no-var": 0,
      "vars-on-top": 1,
      "no-param-reassign": 0,
      "no-cond-assign": 0,
      "no-plusplus": 0,
      "no-underscore-dangle": 0,
      "max-len": ["warn", 100]
    }
};
