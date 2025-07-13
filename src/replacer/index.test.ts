import { describe, expect, it } from 'vitest';
import { replaceRuleDirectiveComment } from './index.js';
import { correctnessRules } from '../generated/rules.js';

const eslintCommentsPrefixes = [
  'eslint-disable',
  'eslint-disable-line',
  'eslint-disable-next-line',
  'eslint-enable',
];

describe('replaceRuleDirectiveComment', () => {
  describe('untouched comments', () => {
    it('should keep non eslint comments', () => {
      const comments = [
        'hello world',
        'eslint-invalid-comment',
        'eslint-disable-what',
        'eslint-disable-line-what',
        'eslint-disable-next-line-what',
      ];

      for (const comment of comments) {
        expect(replaceRuleDirectiveComment(comment)).toBe(comment);
      }
    });

    it('should keep eslint comments which disable / enable all rules', () => {
      const comments = [
        ...eslintCommentsPrefixes,
        ...eslintCommentsPrefixes.map((prefix) => `${prefix} -- description`),
        'eslint-disable -- no-debugger', // rule-name inside comment
      ];

      for (const comment of comments) {
        expect(replaceRuleDirectiveComment(comment)).toBe(comment);
      }
    });

    it('should keep eslint comments for unsupported rules', () => {
      const comments = [
        ...eslintCommentsPrefixes.map((prefix) => `${prefix} unknown-rule`),
        ...eslintCommentsPrefixes.map(
          (prefix) => `${prefix} unknown-rule -- description`
        ),
      ];

      for (const comment of comments) {
        expect(replaceRuleDirectiveComment(comment)).toBe(comment);
      }
    });

    it('should keep eslint comments with multiple rules, where one of them is not supported', () => {
      const comments = [
        ...eslintCommentsPrefixes.map(
          (prefix) => `${prefix} ${correctnessRules[0]}, unknown-rule`
        ),
        ...eslintCommentsPrefixes.map(
          (prefix) =>
            `${prefix} ${correctnessRules[0]}, unknown-rule -- description`
        ),
      ];

      for (const comment of comments) {
        expect(replaceRuleDirectiveComment(comment)).toBe(comment);
      }
    });

    it('should keep eslint comments with multiple rules, where the comma between is missing', () => {
      const comments = [
        // the comma is missing here, it will not count as an valid comment
        // ______________________________________________________________________v
        ...eslintCommentsPrefixes.map(
          (prefix) => `${prefix} ${correctnessRules[0]} ${correctnessRules[1]}`
        ),
        ...eslintCommentsPrefixes.map(
          (prefix) =>
            `${prefix} ${correctnessRules[0]} ${correctnessRules[1]} -- description`
        ),
      ];

      for (const comment of comments) {
        expect(replaceRuleDirectiveComment(comment)).toBe(comment);
      }
    });
  });

  describe('touched comments', () => {
    it('should replace single rule', () => {
      const comments = [
        ...eslintCommentsPrefixes.map(
          (prefix) => `${prefix} ${correctnessRules[0]}`
        ),
        ...eslintCommentsPrefixes.map(
          (prefix) => `${prefix} ${correctnessRules[0]} -- description`
        ),
      ];

      for (const comment of comments) {
        expect(replaceRuleDirectiveComment(comment)).toBe(
          comment.replace('eslint', 'oxlint')
        );
      }
    });

    it('should replace multiple rules', () => {
      const comments = [
        ...eslintCommentsPrefixes.map(
          (prefix) => `${prefix} ${correctnessRules[0]}, ${correctnessRules[1]}`
        ),
        ...eslintCommentsPrefixes.map(
          (prefix) =>
            `${prefix} ${correctnessRules[0]}, ${correctnessRules[1]} -- description`
        ),
      ];

      for (const comment of comments) {
        expect(replaceRuleDirectiveComment(comment)).toBe(
          comment.replace('eslint', 'oxlint')
        );
      }
    });
  });
});
