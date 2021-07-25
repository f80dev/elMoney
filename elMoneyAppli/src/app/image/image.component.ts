import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import {autoRotate, cropToSquare, resizeBase64Img} from "../tools";

@Component({
  selector: 'app-image',
  templateUrl: './image.component.html',
  styleUrls: ['./image.component.sass']
})
export class ImageComponent implements OnChanges,OnInit {
  @Input("src") img:string;
  @Input("width") width="auto";
  @Input("maxwidth") maxwidth="150px";
  @Input("maxheight") maxheight="250px";

  @Input('border') border=true;
  @ViewChild('imgObject') imgObject: ElementRef<HTMLImageElement>;

  constructor() { }

  ngOnInit(): void {


  }

  ngOnChanges(changes: SimpleChanges): void {
    if(this.img){
      if(this.img.endsWith('.png') || this.img.indexOf("image/gif")>0)
        this.border=false;
    }
  }

}
