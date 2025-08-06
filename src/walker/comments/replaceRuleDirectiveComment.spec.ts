import { describe, expect, it } from 'vitest';
import replaceRuleDirectiveComment from './replaceRuleDirectiveComment.js';
import { correctnessRules, nurseryRules } from '../../generated/rules.js';

const eslintCommentsLines = ['eslint-disable-line', 'eslint-disable-next-line'];

const eslintCommentsBlock = ['eslint-disable', 'eslint-enable'];

describe('replaceRuleDirectiveComment', () => {
  describe('untouched comments', () => {
    it('should keep invalid eslint line comments', () => {
      const comments = [
        'hello world',
        'invalid-comment',
        'disable-what',
        'disable-line-what',
        'disable-next-line-what',
        ...eslintCommentsBlock,
      ];

      for (const comment of comments) {
        expect(replaceRuleDirectiveComment(comment, 'Line', {})).toBe(comment);
      }
    });

    it('should keep invalid eslint block comments', () => {
      const comments = [
        'hello world',
        'invalid-comment',
        'disable-what',
        'disable-line-what',
        'disable-next-line-what',
        ...eslintCommentsLines,
      ];

      for (const comment of comments) {
        expect(replaceRuleDirectiveComment(comment, 'Block', {})).toBe(comment);
      }
    });

    it('should ignore comment of the directive', () => {
      const blockComments = eslintCommentsBlock.map(
        (prefix) => `${prefix} ${correctnessRules[0]} -- eslint-disable`
      );
      const lineComments = eslintCommentsLines.map(
        (prefix) =>
          `${prefix} ${correctnessRules[0]} -- eslint-disable-next-line`
      );

      for (const comment of blockComments) {
        const expectedComment = comment.substring(6);
        expect(replaceRuleDirectiveComment(comment, 'Block', {})).toBe(
          `oxlint${expectedComment}`
        );
      }

      for (const comment of lineComments) {
        const expectedComment = comment.substring(6);
        expect(replaceRuleDirectiveComment(comment, 'Line', {})).toBe(
          `oxlint${expectedComment}`
        );
      }
    });

    it('should keep eslint comments which disable / enable all rules', () => {
      const comments = [
        ...eslintCommentsBlock,
        ...eslintCommentsBlock.map((comment) => `${comment} `),
        'disable -- no-debugger', // rule-name inside comment
      ];

      for (const comment of comments) {
        expect(replaceRuleDirectiveComment(comment, 'Block', {})).toBe(comment);
        expect(replaceRuleDirectiveComment(comment, 'Line', {})).toBe(comment);
      }
    });

    it('should keep eslint comments for unsupported rules', () => {
      const blockComments = eslintCommentsBlock.map(
        (prefix) => `${prefix} unknown-rule`
      );
      const lineComments = eslintCommentsLines.map(
        (prefix) => `${prefix} unknown-rule`
      );

      for (const comment of blockComments) {
        expect(replaceRuleDirectiveComment(comment, 'Block', {})).toBe(comment);
      }

      for (const comment of lineComments) {
        expect(replaceRuleDirectiveComment(comment, 'Line', {})).toBe(comment);
      }
    });

    it('should keep eslint comments with multiple rules, where one of them is not supported', () => {
      const blockComments = eslintCommentsBlock.map(
        (prefix) => `${prefix} ${correctnessRules[0]}, unknown-rule`
      );

      const lineComments = eslintCommentsLines.map(
        (prefix) => `${prefix} ${correctnessRules[0]}, unknown-rule`
      );

      for (const comment of blockComments) {
        expect(replaceRuleDirectiveComment(comment, 'Block', {})).toBe(comment);
      }

      for (const comment of lineComments) {
        expect(replaceRuleDirectiveComment(comment, 'Line', {})).toBe(comment);
      }
    });

    it('should keep eslint comments with multiple rules, where the comma between is missing', () => {
      const blockComments = eslintCommentsBlock.map(
        // the comma is missing here, it will not count as an valid comment
        // __________________________________________v
        (prefix) => `${prefix} ${correctnessRules[0]} ${correctnessRules[1]}`
      );

      const lineComments = eslintCommentsLines.map(
        (prefix) => `${prefix} ${correctnessRules[0]} ${correctnessRules[1]}`
      );

      for (const comment of blockComments) {
        expect(replaceRuleDirectiveComment(comment, 'Block', {})).toBe(comment);
      }

      for (const comment of lineComments) {
        expect(replaceRuleDirectiveComment(comment, 'Line', {})).toBe(comment);
      }
    });
  });

  describe('touched comments', () => {
    it('should replace single rule', () => {
      const blockComment = eslintCommentsBlock.map(
        (prefix) => `${prefix} ${correctnessRules[0]}`
      );

      const lineComment = eslintCommentsLines.map(
        (prefix) => `${prefix} ${correctnessRules[0]}`
      );

      for (const comment of blockComment) {
        const newComment = replaceRuleDirectiveComment(comment, 'Block', {});
        expect(comment).toContain('eslint-');
        expect(newComment).toBe(comment.replace('eslint', 'oxlint'));
      }

      for (const comment of lineComment) {
        const newComment = replaceRuleDirectiveComment(comment, 'Line', {});
        expect(comment).toContain('eslint-');
        expect(newComment).toBe(comment.replace('eslint', 'oxlint'));
      }
    });

    it('should replace multiple rules', () => {
      const blockComments = eslintCommentsBlock.map(
        (prefix) => `${prefix} ${correctnessRules[0]}, ${correctnessRules[1]}`
      );

      const lineComments = eslintCommentsLines.map(
        (prefix) => `${prefix} ${correctnessRules[0]}, ${correctnessRules[1]}`
      );

      for (const comment of blockComments) {
        expect(replaceRuleDirectiveComment(comment, 'Block', {})).toBe(
          comment.replace('eslint', 'oxlint')
        );
      }

      for (const comment of lineComments) {
        expect(replaceRuleDirectiveComment(comment, 'Line', {})).toBe(
          comment.replace('eslint', 'oxlint')
        );
      }
    });
  });

  describe('withNurseryCheck', () => {
    it('should ignore nursery rules on default', () => {
      const blockComments = eslintCommentsBlock.map(
        (prefix) => `${prefix} ${nurseryRules[0]}`
      );
      for (const comment of blockComments) {
        expect(replaceRuleDirectiveComment(comment, 'Block', {})).toBe(comment);
      }
    });

    it('should respect nursery rules with `options.withNursery`', () => {
      const blockComments = eslintCommentsBlock.map(
        (prefix) => `${prefix} ${nurseryRules[0]}`
      );

      for (const comment of blockComments) {
        expect(
          replaceRuleDirectiveComment(comment, 'Block', {
            withNursery: true,
          })
        ).toBe(comment.replace('eslint', 'oxlint'));
      }
    });
  });
});
