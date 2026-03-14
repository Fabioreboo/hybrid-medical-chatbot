export interface GoogleProfile {
  id: string;
  displayName: string;
  emails: { value: string; verified: boolean }[];
  photos: { value: string }[];
  provider: 'google';
}