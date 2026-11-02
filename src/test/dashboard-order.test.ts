import { describe, expect, it } from 'vitest';
import { orderColumnFor } from '@/lib/dashboard.functions';

describe('dashboard record ordering', () => {
  it('sorts practice history by its attempted_at column', () => {
    expect(orderColumnFor('practice_history')).toBe('attempted_at');
  });

  it('sorts the other dashboard tables by created_at', () => {
    expect(orderColumnFor('profiles')).toBe('created_at');
    expect(orderColumnFor('user_translations')).toBe('created_at');
    expect(orderColumnFor('user_progress')).toBe('created_at');
    expect(orderColumnFor('practice_items')).toBe('created_at');
    expect(orderColumnFor('learning_topics')).toBe('created_at');
    expect(orderColumnFor('vocabulary_words')).toBe('created_at');
    expect(orderColumnFor('user_roles')).toBe('created_at');
  });
});
