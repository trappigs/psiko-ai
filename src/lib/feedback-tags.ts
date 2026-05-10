/**
 * Per-message AI yanıt geri bildirimi için tag sözlüğü.
 * Sentiment, geri bildirim özetlemesinde renklendirme/gruplama için kullanılır.
 */
export type FeedbackTag = {
  key: string;
  label: string;
  sentiment: 'good' | 'bad';
};

export const FEEDBACK_TAGS: FeedbackTag[] = [
  { key: 'realistic', label: 'Gerçekçi', sentiment: 'good' },
  { key: 'good_style', label: 'Konuşma stili tutuyor', sentiment: 'good' },
  { key: 'good_resistance', label: 'İyi direnç', sentiment: 'good' },
  { key: 'natural_turkish', label: 'Türkçesi doğal', sentiment: 'good' },
  { key: 'artificial', label: 'Yapay/robotik', sentiment: 'bad' },
  { key: 'too_closed', label: 'Fazla kapalı', sentiment: 'bad' },
  { key: 'too_open', label: 'Fazla açık', sentiment: 'bad' },
  { key: 'out_of_character', label: 'Karakterden çıktı', sentiment: 'bad' },
  { key: 'therapist_like', label: 'Terapist gibi', sentiment: 'bad' },
  { key: 'unnatural_turkish', label: 'Türkçesi yapay', sentiment: 'bad' },
  { key: 'misses_signal', label: 'Sinyal kaçırıyor', sentiment: 'bad' },
];

export const FEEDBACK_TAG_BY_KEY = Object.fromEntries(
  FEEDBACK_TAGS.map((t) => [t.key, t])
) as Record<string, FeedbackTag>;
