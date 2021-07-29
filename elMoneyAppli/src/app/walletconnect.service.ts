import {Injectable, OnInit} from '@angular/core';
import WalletConnect from "@walletconnect/browser";

@Injectable({
  providedIn: 'root'
})
export class WalletconnectService implements OnInit {

  connector:any;
  constructor() { }

  ngOnInit(): void {

    this.connector = new WalletConnect({
      bridge: "https://bridge.walletconnect.org",
    });

    if (!this.connector.connected) {
      // create new session

      this.connector.createSession().then(() => {
        // get uri for QR Code modal
        const uri = this.connector.uri;
      });
    }

    this.connector.on("connect", (error, payload) => {
      debugger
      if (error) {
        throw error;
      }



      // Get provided accounts and chainId
      const {accounts, chainId} = payload.params[0];
    });

    this.connector.on("session_update", (error, payload) => {
      if (error) {
        throw error;
      }

      // Get updated accounts and chainId
      const {accounts, chainId} = payload.params[0];
    });


    this.connector.on("disconnect", (error, payload) => {
      if (error) {
        throw error;
      }
    });
  }

}
