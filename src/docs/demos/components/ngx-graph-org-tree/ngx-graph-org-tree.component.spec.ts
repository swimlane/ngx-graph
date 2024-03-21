import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NgxGraphOrgTreeComponent } from './ngx-graph-org-tree.component';
import { NgxGraphModule } from '@swimlane/ngx-graph';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('NgxGraphOrgTreeComponent', () => {
  let component: NgxGraphOrgTreeComponent;
  let fixture: ComponentFixture<NgxGraphOrgTreeComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [NgxGraphOrgTreeComponent],
      imports: [NgxGraphModule, NoopAnimationsModule]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NgxGraphOrgTreeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  [
    [false, false, false],
    [false, true, true],
    [true, false, true],
    [true, true, true]
  ].forEach(([enableZoom, enableTrackpadSupport, shouldBeAEnabled]) => {
    it(`mouseWheelEnabled is ${shouldBeAEnabled}, 
          given enableZoom is ${enableZoom} 
          and enableTrackpadSupport is ${enableTrackpadSupport}`, () => {
      component.enableZoom = enableZoom;
      component.enableTrackpadSupport = enableTrackpadSupport;

      fixture.detectChanges();

      const actual = fixture.debugElement.query(By.css('[mouseWheel]'));
      expect(actual.nativeElement.getAttribute('ng-reflect-mouse-wheel-enabled')).toEqual(shouldBeAEnabled.toString());
    });
  });
});
