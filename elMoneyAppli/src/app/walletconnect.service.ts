import {Injectable, OnInit} from '@angular/core';
import WalletConnect from "@walletconnect/browser";
import WalletConnectQRCodeModal from "@walletconnect/qrcode-modal";

@Injectable({
  providedIn: 'root'
})
export class WalletconnectService implements OnInit {

  connector:any;
  constructor() { }

  ngOnInit(): void {
    this.connector = new WalletConnect({
      bridge: "https://bridge.walletconnect.org" // Required
    });

    if (!this.connector.connected) {
      // create new session
      this.connector.createSession().then(() => {
        // get uri for QR Code modal
        const uri = this.connector.uri;
        debugger
        // display QR Code modal
        WalletConnectQRCodeModal.open(uri, () => {
          console.log("QR Code Modal closed");
        });
      });
    }

    this.connector.on("connect", (error, payload) => {
      if (error) {
        throw error;
      }

      // Close QR Code Modal
      WalletConnectQRCodeModal.close();

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
