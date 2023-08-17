import { Component, HostListener, OnDestroy, OnInit, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { PeerActions } from '../../../../actions/peer.actions';
import { ComponentCanDeactivate } from '../../../../guards/active-stream/active-stream.guard';
import { AppState } from '../../../../models/app.model';
import { selectPeerError, selectPeerServerConnected, selectRoomId, selectServerOffline, selectSocketServerConnected, streamIsActive } from '../../../../selectors/peer.selectors';
import { AbstractControl, FormBuilder, ValidationErrors, Validators } from '@angular/forms';

@Component({
  selector: 'app-peer-landing',
  templateUrl: './peer-landing.component.html',
  styleUrls: ['./peer-landing.component.scss'],
})
export class PeerLandingComponent implements OnInit, OnDestroy, ComponentCanDeactivate {
  @HostListener('window:beforeunload')
  public socketServerConnected: Signal<boolean | undefined>;
  public peerServerConnected: Signal<boolean | undefined>;
  public serverError: Signal<string | undefined>;
  public serverOffline: Signal<boolean | undefined>;
  public roomId: Signal<string | undefined>;

  public joinSessionFormGroup = this.fb.group({
    session: this.fb.control<string>('', [Validators.required, (ctrl) => this._validateSessionId(ctrl)]),
    joinCode: this.fb.control<string>('', [Validators.required, (ctrl) => this._validateJoinCode(ctrl)])
  })

  constructor(private store: Store<AppState>,
              private fb: FormBuilder) {
    this.socketServerConnected = toSignal(this.store.select(selectSocketServerConnected))
    this.peerServerConnected = toSignal(this.store.select(selectPeerServerConnected));
    this.roomId = toSignal(this.store.select(selectRoomId));
    this.serverError = toSignal(this.store.select(selectPeerError));
    this.serverOffline = toSignal(this.store.select(selectServerOffline));
  }

  ngOnInit(): void {
    this.store.dispatch(PeerActions.connectSocketServer());
  }

  ngOnDestroy(): void {
    this.store.dispatch(PeerActions.disconnectPeerServer());
  }

  canDeactivate(): boolean | Observable<boolean> {
    return !toSignal(this.store.select(streamIsActive))();
  }

  createRoom() {
    this.store.dispatch(PeerActions.createBroadcastRoom());
  }

  joinSession(): boolean {
    console.log('joinSession')
    this.joinSessionFormGroup.updateValueAndValidity();
    if (this.joinSessionFormGroup.valid) {
      const id: string = this.joinSessionFormGroup.value.session as string;
      const joinCode: string = this.joinSessionFormGroup.value.joinCode as string;
      this.store.dispatch(PeerActions.joinBroadcastRoom({id, joinCode}));
    } else {
      this.joinSessionFormGroup.markAllAsTouched();
    }
    return false;
  }

  private _validateSessionId(control: AbstractControl): ValidationErrors | null {
    if (control.value) {
      const exp = new RegExp(/^([acdefghjkmnpqrstuvwxyz2345679]{4})-([acdefghjkmnpqrstuvwxyz2345679]{4})$/i)
      if (!exp.test(control.value)) {
        return { invalid: true }
      }
    }
    return null;
  }

  private _validateJoinCode(control: AbstractControl): ValidationErrors | null {
    if (control.value) {
      const exp = new RegExp(/^([acdefghjkmnpqrstuvwxyz2345679]{4})$/i)
      if (!exp.test(control.value)) {
        return { invalid: true }
      }
    }
    return null;
  }
}
