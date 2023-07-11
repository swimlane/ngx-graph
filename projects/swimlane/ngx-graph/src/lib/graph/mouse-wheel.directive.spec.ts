import { MouseWheelDirective } from '@swimlane/ngx-graph';

describe('MouseWheelDirective', () => {
  let eventMock: WheelEvent;

  let directive: MouseWheelDirective;

  beforeEach(() => {
    directive = new MouseWheelDirective();
    eventMock = {
      deltaY: 5,
      returnValue: true,
      preventDefault: () => null
    } as WheelEvent;

    spyOn(eventMock, 'preventDefault').and.returnValue();
    spyOn(directive.mouseWheelUp, 'emit').and.returnValue();
    spyOn(directive.mouseWheelDown, 'emit').and.returnValue();

    (window as any).event = null;
  });

  it('should call preventDefault & emit mouseWheelDown, if mouseWheel is enabled', () => {
    directive.mouseWheelEnabled = true;

    directive.mouseWheelFunc(eventMock);

    expect(eventMock.returnValue).toBe(false);
    expect(eventMock.preventDefault).toHaveBeenCalled();
    expect(directive.mouseWheelDown.emit).toHaveBeenCalled();
    expect(directive.mouseWheelUp.emit).not.toHaveBeenCalled();
  });

  it('should do nothing, if mouseWheel is not enabled', () => {
    directive.mouseWheelEnabled = false;

    directive.mouseWheelFunc(eventMock);

    expect(eventMock.returnValue).toBe(true);
    expect(eventMock.preventDefault).not.toHaveBeenCalled();
    expect(directive.mouseWheelDown.emit).not.toHaveBeenCalled();
    expect(directive.mouseWheelUp.emit).not.toHaveBeenCalled();
  });
});
