import {Component, Inject} from '@angular/core';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';


export interface DialogData {
  title: string;
  result: string;
  question:string;
  onlyConfirm:boolean;
  emojis:boolean;
  lbl_ok:string,
  type:string,
  lbl_cancel:string,
  lbl_sup:string
}


@Component({
  selector: 'app-prompt',
  templateUrl: './prompt.component.html',
  styleUrls: ['./prompt.component.sass']
})

export class PromptComponent {

  showEmoji=false;
  _type="text";

  constructor(
    public dialogRef: MatDialogRef<PromptComponent>,@Inject(MAT_DIALOG_DATA) public data: DialogData) {
    if(data.hasOwnProperty("type"))this._type=data.type;
  }

  onNoClick(): void {
    this.dialogRef.close(null);
  }

  selectEmoji(event){
    this.data.result=this.data.result+event.emoji.native;
    this.showEmoji=false;
  }


  onEnter(evt:any) {
    if(evt.keyCode==13)
      this.dialogRef.close(this.data.result);
  }
}
