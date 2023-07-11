import { GraphComponent } from '@swimlane/ngx-graph';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LayoutService } from '@swimlane/ngx-graph/lib/graph/layouts/layout.service';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('GraphComponent', () => {
  let fixture: ComponentFixture<GraphComponent>;
  let component: GraphComponent;
  let aMouseWheelEvent: WheelEvent;

  beforeEach(() => {
    (window as any).event = null;
    aMouseWheelEvent = {
      deltaY: 5,
      preventDefault: () => null
    } as WheelEvent;

    TestBed.configureTestingModule({
      providers: [LayoutService, NoopAnimationsModule],
      imports: [NoopAnimationsModule]
    });
    fixture = TestBed.createComponent(GraphComponent);

    component = fixture.componentInstance;
    component.enableZoom = false;
    component.enableTrackpadSupport = false;
  });

  it('disables mouseWheel directive, if neither zoom nor trackpad is enabled', () => {
    spyOn(component, 'onZoom');
    spyOn(aMouseWheelEvent, 'preventDefault');

    triggerMouseWheelEvent();

    expect(component.onZoom).not.toHaveBeenCalled();
    expect(aMouseWheelEvent.preventDefault).not.toHaveBeenCalled();
  });

  ['enableZoom', 'enableTrackpadSupport'].forEach(propertyName =>
    it(`enables mouseWheel directive, if ${propertyName} is true`, () => {
      component[propertyName] = true;
      spyOn(component, 'onZoom');
      spyOn(aMouseWheelEvent, 'preventDefault');

      triggerMouseWheelEvent();

      expect(component.onZoom).toHaveBeenCalled();
      expect(aMouseWheelEvent.preventDefault).toHaveBeenCalled();
    })
  );

  function triggerMouseWheelEvent() {
    fixture.detectChanges();
    fixture.debugElement.children[0].triggerEventHandler('onmousewheel', aMouseWheelEvent);
    fixture.detectChanges();
  }
});
