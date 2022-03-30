import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminComponent } from './admin.component';
import {RouterTestingModule} from "@angular/router/testing";
import {HttpClientTestingModule} from "@angular/common/http/testing";
import {MatSnackBarModule} from "@angular/material/snack-bar";
import {UserService} from "../user.service";
import {ActivatedRoute} from "@angular/router";
import {ApiService} from "../api.service";
import {ConfigService} from "../config.service";
import {SocketIoConfig, SocketIoModule} from "ngx-socket-io";
import {NO_ERRORS_SCHEMA} from "@angular/core";
import {environment} from "../../environments/environment";
import {MatDialog, MatDialogModule, MatDialogRef} from "@angular/material/dialog";
import {NoopAnimationsModule} from "@angular/platform-browser/animations";



const config: SocketIoConfig = {
  url: environment.domain_server,
  options: {}
};


describe('AdminComponent', () => {
    let component: AdminComponent;
    let fixture: ComponentFixture<AdminComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [AdminComponent],
            imports: [NoopAnimationsModule,RouterTestingModule,HttpClientTestingModule,MatSnackBarModule,SocketIoModule.forRoot(config),MatDialogModule],
            providers: [UserService,ApiService,ConfigService],
            schemas: [ NO_ERRORS_SCHEMA ]
        })
            .compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(AdminComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it("test local",()=>{
      expect(component.islocal()).toBeTrue()
    });
});
