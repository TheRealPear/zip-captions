import { Inject, Injectable } from '@angular/core';
import { LocalDbService } from '../../../services/local-db/local-db.service';
import { from, Observable, Subject } from 'rxjs';
import { Transcript, TranscriptTextSegment } from 'shared-ui';

@Injectable({
  providedIn: 'root'
})
export class TranscriptionService {

  private transcriptId?: number;
  private lastTimestamp?: Date;
  private key: string;
  private dbInitialized: boolean;
  constructor(@Inject(LocalDbService) private localDb: LocalDbService) {
    this.dbInitialized = false;
    const key = localStorage.getItem('zip_captions_transcription');
    if (key) {
      this.key = key;
    } else {
      const array = new Uint8Array(32);
      self.crypto.getRandomValues(array);
      this.key = this._bytesToSring(array);
      localStorage.setItem('zip_captions_transcription', this.key);
    }
  }

  async initTranscriptDatabase(userId: string): Promise<void> {
    const encoded = this._stringToBytes(this.key)
    await this.localDb.init(userId, encoded);
    this.dbInitialized = true;
  }

  async deInitTranscriptDatabase(): Promise<void> {
    this.transcriptId = undefined;
    this.lastTimestamp = undefined;
    await this.localDb.deInitDatabase();
    this.dbInitialized = false;
  }

  dbIsInitialized(): boolean {
    return !!this.dbInitialized;
  }

  async createTranscript(title: string): Promise<number> {
    this.transcriptId = await this.localDb.createTranscript(title);
    this.lastTimestamp = new Date();
    return this.transcriptId;
  }

  async createTranscriptSegment(text: string, start: Date | undefined): Promise<number> {
    if (this.transcriptId === undefined) {
      throw new Error('No transcript ID set')
    } 
    if (!this.lastTimestamp) {
      throw new Error('No start timestamp defined')
    }
    const result = await this.localDb.createTranscriptSegment({
      transcriptId: this.transcriptId,
      text,
      start: start || this.lastTimestamp,
      end: new Date()
    });
    this.lastTimestamp = new Date();
    return result;
  }

  async finalizeTranscript(): Promise<void> {
    if (!this.transcriptId) {
      throw new Error('No transcript ID set')
    }
    await this.localDb.updateTranscript(this.transcriptId, { end: new Date() })
    this.transcriptId = undefined;
    this.lastTimestamp = undefined;
  }

  listTranscripts(): Observable<Transcript[]> {
    return from(this.localDb.listTranscripts());
  }

  listTranscriptSegments(transcriptId: number): Observable<TranscriptTextSegment[]> {
    return from(this.localDb.getTranscriptSegments(transcriptId));
  }

  // https://codereview.stackexchange.com/a/3589/75693
  private _bytesToSring(bytes: Uint8Array): string {
    const chars = [];
    for(let i = 0, n = bytes.length; i < n;) {
        chars.push(((bytes[i++] & 0xff) << 8) | (bytes[i++] & 0xff));
    }
    return String.fromCharCode.apply(null, chars);
  }

  // https://codereview.stackexchange.com/a/3589/75693
  private _stringToBytes(str: string): Uint8Array {
    const bytes = [];
    for(let i = 0, n = str.length; i < n; i++) {
        const char = str.charCodeAt(i);
        bytes.push(char >>> 8, char & 0xFF);
    }
    return new Uint8Array(bytes);
  }
}
