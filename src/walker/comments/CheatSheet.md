# ✅ ESLint Directive Cheat Sheet

## 🔧 Rule Configuration

| Directive                                        | Comment Type | Purpose                                                                    |
| ------------------------------------------------ | ------------ | -------------------------------------------------------------------------- |
| `/* eslint rule-name: "off" */`                  | **Block**    | Configure rules for the **entire file** or at the location of the comment. |
| Example:                                         |              |                                                                            |
| `/* eslint eqeqeq: "off", no-console: "warn" */` | Block        | Disables `eqeqeq`, warns for `console.log`.                                |

---

## 🌍 Global Variables

| Directive                 | Comment Type | Purpose                                                    |
| ------------------------- | ------------ | ---------------------------------------------------------- |
| `/* global var1, var2 */` | **Block**    | Declares globals so ESLint doesn’t mark them as undefined. |
| Example:                  |              |                                                            |
| `/* global $, jQuery */`  | Block        | Tells ESLint that `$` and `jQuery` are available globally. |

---

## 🌐 Environment Declaration

| Directive                     | Comment Type | Purpose                                                          |
| ----------------------------- | ------------ | ---------------------------------------------------------------- |
| `/* eslint-env env1, env2 */` | **Block**    | Declares environments so ESLint knows which globals are allowed. |
| Example:                      |              |                                                                  |
| `/* eslint-env node, es6 */`  | Block        | Enables Node.js and ES6 environments.                            |

---

## 🚫 Disabling ESLint Rules

| Directive                           | Comment Type | Affects                | Notes                                                    |
| ----------------------------------- | ------------ | ---------------------- | -------------------------------------------------------- |
| `/* eslint-disable */`              | **Block**    | All following code     | Disables **all rules** unless specific rules are listed. |
| `/* eslint-disable rule1, rule2 */` | **Block**    | All following code     | Disables only listed rules.                              |
| `/* eslint-enable */`               | **Block**    | Re-enables all rules   | Paired with `eslint-disable`.                            |
| `// eslint-disable-line rule1`      | **Line**     | That specific line     | Use with specific rules or all rules.                    |
| `// eslint-disable-next-line rule1` | **Line**     | The **next line** only | Very handy for one-off exceptions.                       |

---

## 📤 Exported Variables

| Directive                   | Comment Type | Purpose                                                 |
| --------------------------- | ------------ | ------------------------------------------------------- |
| `/* exported var1, var2 */` | **Block**    | Declares that variables are meant to be used elsewhere. |
| Example:                    |              |                                                         |
| `/* exported myFunction */` | Block        | Avoids "defined but never used" warnings in scripts.    |
