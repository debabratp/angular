/*!
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {AfterViewChecked, AfterViewInit, Component, Directive, ElementRef, forwardRef, inject, Inject, InjectionToken, Input, OnInit, ViewChild} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';

import {getComponent, getDirectives} from '../../src/render3/util/discovery_utils';

/**
 * Temporary `any` used for metadata until `hostDirectives` is enabled publicly.
 * TODO(crisbeto): remove this once host directives are enabled in the public API.
 */
type HostDirectiveAny = any;

describe('host directives', () => {
  it('should apply a basic host directive', () => {
    const logs: string[] = [];

    @Directive({
      standalone: true,
      host: {'host-dir-attr': '', 'class': 'host-dir', 'style': 'height: 50px'}
    })
    class HostDir {
      constructor() {
        logs.push('HostDir');
      }
    }

    @Directive({
      selector: '[dir]',
      host: {'host-attr': '', 'class': 'dir', 'style': 'width: 50px'},
      hostDirectives: [HostDir]
    } as HostDirectiveAny)
    class Dir {
      constructor() {
        logs.push('Dir');
      }
    }

    @Component({template: '<div dir></div>'})
    class App {
    }

    TestBed.configureTestingModule({declarations: [App, Dir]});
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    expect(logs).toEqual(['HostDir', 'Dir']);
    expect(fixture.nativeElement.innerHTML)
        .toBe(
            '<div host-dir-attr="" host-attr="" dir="" ' +
            'class="host-dir dir" style="height: 50px; width: 50px;"></div>');
  });

  it('should apply a host directive referenced through a forwardRef', () => {
    const logs: string[] = [];

    @Directive({
      selector: '[dir]',
      hostDirectives: [forwardRef(() => HostDir), {directive: forwardRef(() => OtherHostDir)}]
    } as HostDirectiveAny)
    class Dir {
      constructor() {
        logs.push('Dir');
      }
    }

    @Directive({standalone: true})
    class HostDir {
      constructor() {
        logs.push('HostDir');
      }
    }

    @Directive({standalone: true})
    class OtherHostDir {
      constructor() {
        logs.push('OtherHostDir');
      }
    }

    @Component({template: '<div dir></div>'})
    class App {
    }

    TestBed.configureTestingModule({declarations: [App, Dir]});
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    expect(logs).toEqual(['HostDir', 'OtherHostDir', 'Dir']);
  });

  it('should apply a chain of host directives', () => {
    const logs: string[] = [];
    const token = new InjectionToken('message');
    let diTokenValue: string;

    @Directive({
      host: {
        'class': 'leaf',
        'id': 'leaf-id',
      },
      providers: [{provide: token, useValue: 'leaf value'}],
      standalone: true
    })
    class Chain1_3 {
      constructor(@Inject(token) tokenValue: string) {
        diTokenValue = tokenValue;
        logs.push('Chain1 - level 3');
      }
    }

    @Directive({
      standalone: true,
      hostDirectives: [Chain1_3],
    } as HostDirectiveAny)
    class Chain1_2 {
      constructor() {
        logs.push('Chain1 - level 2');
      }
    }

    @Directive({
      standalone: true,
      hostDirectives: [Chain1_2],
    } as HostDirectiveAny)
    class Chain1 {
      constructor() {
        logs.push('Chain1 - level 1');
      }
    }

    @Directive({
      standalone: true,
      host: {
        'class': 'middle',
        'id': 'middle-id',
      },
      providers: [{provide: token, useValue: 'middle value'}],
    })
    class Chain2_2 {
      constructor() {
        logs.push('Chain2 - level 2');
      }
    }

    @Directive({
      standalone: true,
      hostDirectives: [Chain2_2],
    } as HostDirectiveAny)
    class Chain2 {
      constructor() {
        logs.push('Chain2 - level 1');
      }
    }

    @Directive({standalone: true})
    class Chain3_2 {
      constructor() {
        logs.push('Chain3 - level 2');
      }
    }

    @Directive({standalone: true, hostDirectives: [Chain3_2]} as HostDirectiveAny)
    class Chain3 {
      constructor() {
        logs.push('Chain3 - level 1');
      }
    }

    @Component({
      selector: 'my-comp',
      host: {
        'class': 'host',
        'id': 'host-id',
      },
      template: '',
      hostDirectives: [Chain1, Chain2, Chain3],
      providers: [{provide: token, useValue: 'host value'}],
    } as HostDirectiveAny)
    class MyComp {
      constructor() {
        logs.push('MyComp');
      }
    }

    @Directive({standalone: true})
    class SelectorMatchedHostDir {
      constructor() {
        logs.push('SelectorMatchedHostDir');
      }
    }

    @Directive({
      selector: '[selector-matched-dir]',
      hostDirectives: [SelectorMatchedHostDir],
    } as HostDirectiveAny)
    class SelectorMatchedDir {
      constructor() {
        logs.push('SelectorMatchedDir');
      }
    }

    @Component({template: '<my-comp selector-matched-dir></my-comp>'})
    class App {
    }

    TestBed.configureTestingModule({declarations: [App, MyComp, SelectorMatchedDir]});
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    expect(diTokenValue!).toBe('host value');
    expect(fixture.nativeElement.innerHTML)
        .toBe('<my-comp id="host-id" selector-matched-dir="" class="leaf middle host"></my-comp>');
    expect(logs).toEqual([
      'Chain1 - level 3',
      'Chain1 - level 2',
      'Chain1 - level 1',
      'Chain2 - level 2',
      'Chain2 - level 1',
      'Chain3 - level 2',
      'Chain3 - level 1',
      'MyComp',
      'SelectorMatchedHostDir',
      'SelectorMatchedDir',
    ]);
  });

  it('should be able to query for the host directives', () => {
    let hostInstance!: Host;
    let firstHostDirInstance!: FirstHostDir;
    let secondHostDirInstance!: SecondHostDir;

    @Directive({standalone: true})
    class SecondHostDir {
      constructor() {
        secondHostDirInstance = this;
      }
    }

    @Directive({standalone: true, hostDirectives: [SecondHostDir]} as HostDirectiveAny)
    class FirstHostDir {
      constructor() {
        firstHostDirInstance = this;
      }
    }

    @Directive({selector: '[dir]', hostDirectives: [FirstHostDir]} as HostDirectiveAny)
    class Host {
      constructor() {
        hostInstance = this;
      }
    }

    @Component({template: '<div dir></div>'})
    class App {
      @ViewChild(FirstHostDir) firstHost!: FirstHostDir;
      @ViewChild(SecondHostDir) secondHost!: SecondHostDir;
    }

    TestBed.configureTestingModule({declarations: [App, Host]});
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    expect(hostInstance instanceof Host).toBe(true);
    expect(firstHostDirInstance instanceof FirstHostDir).toBe(true);
    expect(secondHostDirInstance instanceof SecondHostDir).toBe(true);

    expect(fixture.componentInstance.firstHost).toBe(firstHostDirInstance);
    expect(fixture.componentInstance.secondHost).toBe(secondHostDirInstance);
  });

  it('should be able to reference exported host directives', () => {
    @Directive({standalone: true, exportAs: 'secondHost'})
    class SecondHostDir {
      name = 'SecondHost';
    }

    @Directive(
        {standalone: true, hostDirectives: [SecondHostDir], exportAs: 'firstHost'} as
        HostDirectiveAny)
    class FirstHostDir {
      name = 'FirstHost';
    }

    @Directive({selector: '[dir]', hostDirectives: [FirstHostDir]} as HostDirectiveAny)
    class Host {
    }

    @Component({
      template: `
        <div
          dir
          #firstHost="firstHost"
          #secondHost="secondHost">{{firstHost.name}} | {{secondHost.name}}</div>
      `
    })
    class App {
    }

    TestBed.configureTestingModule({declarations: [App, Host]});
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('FirstHost | SecondHost');
  });

  // TODO(crisbeto): add a test for `ngOnChanges`.
  describe('lifecycle hooks', () => {
    it('should invoke lifecycle hooks from the host directives', () => {
      const logs: string[] = [];

      @Directive({standalone: true})
      class HostDir implements OnInit, AfterViewInit, AfterViewChecked {
        ngOnInit() {
          logs.push('HostDir - ngOnInit');
        }

        ngAfterViewInit() {
          logs.push('HostDir - ngAfterViewInit');
        }

        ngAfterViewChecked() {
          logs.push('HostDir - ngAfterViewChecked');
        }
      }

      @Directive({standalone: true})
      class OtherHostDir implements OnInit, AfterViewInit, AfterViewChecked {
        ngOnInit() {
          logs.push('OtherHostDir - ngOnInit');
        }

        ngAfterViewInit() {
          logs.push('OtherHostDir - ngAfterViewInit');
        }

        ngAfterViewChecked() {
          logs.push('OtherHostDir - ngAfterViewChecked');
        }
      }

      @Directive({selector: '[dir]', hostDirectives: [HostDir, OtherHostDir]} as HostDirectiveAny)
      class Dir implements OnInit, AfterViewInit, AfterViewChecked {
        ngOnInit() {
          logs.push('Dir - ngOnInit');
        }

        ngAfterViewInit() {
          logs.push('Dir - ngAfterViewInit');
        }

        ngAfterViewChecked() {
          logs.push('Dir - ngAfterViewChecked');
        }
      }

      @Component({template: '<div dir></div>'})
      class App {
      }

      TestBed.configureTestingModule({declarations: [App, Dir]});
      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();

      expect(logs).toEqual([
        'HostDir - ngOnInit',
        'OtherHostDir - ngOnInit',
        'Dir - ngOnInit',
        'HostDir - ngAfterViewInit',
        'HostDir - ngAfterViewChecked',
        'OtherHostDir - ngAfterViewInit',
        'OtherHostDir - ngAfterViewChecked',
        'Dir - ngAfterViewInit',
        'Dir - ngAfterViewChecked',
      ]);
    });

    // Note: lifecycle hook order is different when components and directives are mixed so this
    // test aims to cover it. Usually lifecycle hooks are invoked based on the order in which
    // directives were matched, but components bypass this logic and always execute first.
    it('should invoke host directive lifecycle hooks before the host component hooks', () => {
      const logs: string[] = [];

      // Utility so we don't have to repeat the logging code.
      @Directive({standalone: true})
      abstract class LogsLifecycles implements OnInit, AfterViewInit {
        abstract name: string;

        ngOnInit() {
          logs.push(`${this.name} - ngOnInit`);
        }

        ngAfterViewInit() {
          logs.push(`${this.name} - ngAfterViewInit`);
        }
      }

      @Directive({standalone: true})
      class ChildHostDir extends LogsLifecycles {
        override name = 'ChildHostDir';
      }

      @Directive({standalone: true})
      class OtherChildHostDir extends LogsLifecycles {
        override name = 'OtherChildHostDir';
      }

      @Component({
        selector: 'child',
        hostDirectives: [ChildHostDir, OtherChildHostDir],
      } as HostDirectiveAny)
      class Child extends LogsLifecycles {
        override name = 'Child';
      }

      @Directive({standalone: true})
      class ParentHostDir extends LogsLifecycles {
        override name = 'ParentHostDir';
      }

      @Directive({standalone: true})
      class OtherParentHostDir extends LogsLifecycles {
        override name = 'OtherParentHostDir';
      }

      @Component({
        selector: 'parent',
        hostDirectives: [ParentHostDir, OtherParentHostDir],
        template: '<child plain-dir="PlainDir on child"></child>',
      } as HostDirectiveAny)
      class Parent extends LogsLifecycles {
        override name = 'Parent';
      }

      @Directive({selector: '[plain-dir]'})
      class PlainDir extends LogsLifecycles {
        @Input('plain-dir') override name = '';
      }

      @Component({template: '<parent plain-dir="PlainDir on parent"></parent>'})
      class App {
      }

      TestBed.configureTestingModule({declarations: [App, Parent, Child, PlainDir]});
      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();

      expect(logs).toEqual([
        'ParentHostDir - ngOnInit',
        'OtherParentHostDir - ngOnInit',
        'Parent - ngOnInit',
        'PlainDir on parent - ngOnInit',
        'ChildHostDir - ngOnInit',
        'OtherChildHostDir - ngOnInit',
        'Child - ngOnInit',
        'PlainDir on child - ngOnInit',
        'ChildHostDir - ngAfterViewInit',
        'OtherChildHostDir - ngAfterViewInit',
        'Child - ngAfterViewInit',
        'PlainDir on child - ngAfterViewInit',
        'ParentHostDir - ngAfterViewInit',
        'OtherParentHostDir - ngAfterViewInit',
        'Parent - ngAfterViewInit',
        'PlainDir on parent - ngAfterViewInit',
      ]);
    });
  });

  describe('host bindings', () => {
    it('should apply the host bindings from all host directives', () => {
      const clicks: string[] = [];

      @Directive({standalone: true, host: {'host-dir-attr': 'true', '(click)': 'handleClick()'}})
      class HostDir {
        handleClick() {
          clicks.push('HostDir');
        }
      }

      @Directive(
          {standalone: true, host: {'other-host-dir-attr': 'true', '(click)': 'handleClick()'}})
      class OtherHostDir {
        handleClick() {
          clicks.push('OtherHostDir');
        }
      }

      @Directive({
        selector: '[dir]',
        host: {'host-attr': 'true', '(click)': 'handleClick()'},
        hostDirectives: [HostDir, OtherHostDir]
      } as HostDirectiveAny)
      class Dir {
        handleClick() {
          clicks.push('Dir');
        }
      }

      @Component({template: '<button dir></button>'})
      class App {
      }

      TestBed.configureTestingModule({declarations: [App, Dir]});
      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();

      const host = fixture.nativeElement.querySelector('[dir]');

      expect(host.outerHTML)
          .toBe(
              '<button host-dir-attr="true" other-host-dir-attr="true" host-attr="true" dir=""></button>');

      host.click();
      fixture.detectChanges();

      expect(clicks).toEqual(['HostDir', 'OtherHostDir', 'Dir']);
    });

    it('should have the host bindings take precedence over the ones from the host directives',
       () => {
         @Directive({standalone: true, host: {'id': 'host-dir'}})
         class HostDir {
         }

         @Directive({standalone: true, host: {'id': 'other-host-dir'}})
         class OtherHostDir {
         }

         @Directive(
             {selector: '[dir]', host: {'id': 'host'}, hostDirectives: [HostDir, OtherHostDir]} as
             HostDirectiveAny)
         class Dir {
         }

         @Component({template: '<div dir></div>'})
         class App {
         }

         TestBed.configureTestingModule({declarations: [App, Dir]});
         const fixture = TestBed.createComponent(App);
         fixture.detectChanges();

         expect(fixture.nativeElement.querySelector('[dir]').getAttribute('id')).toBe('host');
       });
  });

  describe('dependency injection', () => {
    it('should allow the host to inject its host directives', () => {
      let hostInstance!: Host;
      let firstHostDirInstance!: FirstHostDir;
      let secondHostDirInstance!: SecondHostDir;

      @Directive({standalone: true})
      class SecondHostDir {
        constructor() {
          secondHostDirInstance = this;
        }
      }

      @Directive({standalone: true, hostDirectives: [SecondHostDir]} as HostDirectiveAny)
      class FirstHostDir {
        constructor() {
          firstHostDirInstance = this;
        }
      }

      @Directive({selector: '[dir]', hostDirectives: [FirstHostDir]} as HostDirectiveAny)
      class Host {
        firstHostDir = inject(FirstHostDir);
        secondHostDir = inject(SecondHostDir);

        constructor() {
          hostInstance = this;
        }
      }

      @Component({template: '<div dir></div>'})
      class App {
      }

      TestBed.configureTestingModule({declarations: [App, Host]});
      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();

      expect(hostInstance instanceof Host).toBe(true);
      expect(firstHostDirInstance instanceof FirstHostDir).toBe(true);
      expect(secondHostDirInstance instanceof SecondHostDir).toBe(true);

      expect(hostInstance.firstHostDir).toBe(firstHostDirInstance);
      expect(hostInstance.secondHostDir).toBe(secondHostDirInstance);
    });

    it('should be able to inject a host directive into a child component', () => {
      let hostDirectiveInstance!: HostDir;

      @Component({selector: 'child', template: ''})
      class Child {
        hostDir = inject(HostDir);
      }

      @Directive({standalone: true})
      class HostDir {
        constructor() {
          hostDirectiveInstance = this;
        }
      }

      @Component({
        selector: 'host',
        template: '<child></child>',
        hostDirectives: [HostDir],
      } as HostDirectiveAny)
      class Host {
        @ViewChild(Child) child!: Child;
      }

      @Component({template: '<host></host>'})
      class App {
        @ViewChild(Host) host!: Host;
      }

      TestBed.configureTestingModule({declarations: [App, Host, Child]});
      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();
      const injectedInstance = fixture.componentInstance.host.child.hostDir;

      expect(injectedInstance instanceof HostDir).toBe(true);
      expect(injectedInstance).toBe(hostDirectiveInstance);
    });

    it('should allow the host directives to inject their host', () => {
      let hostInstance!: Host;
      let firstHostDirInstance!: FirstHostDir;
      let secondHostDirInstance!: SecondHostDir;

      @Directive({standalone: true})
      class SecondHostDir {
        host = inject(Host);

        constructor() {
          secondHostDirInstance = this;
        }
      }

      @Directive({standalone: true, hostDirectives: [SecondHostDir]} as HostDirectiveAny)
      class FirstHostDir {
        host = inject(Host);

        constructor() {
          firstHostDirInstance = this;
        }
      }

      @Directive({selector: '[dir]', hostDirectives: [FirstHostDir]} as HostDirectiveAny)
      class Host {
        constructor() {
          hostInstance = this;
        }
      }

      @Component({template: '<div dir></div>'})
      class App {
      }

      TestBed.configureTestingModule({declarations: [App, Host]});
      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();

      expect(hostInstance instanceof Host).toBe(true);
      expect(firstHostDirInstance instanceof FirstHostDir).toBe(true);
      expect(secondHostDirInstance instanceof SecondHostDir).toBe(true);

      expect(firstHostDirInstance.host).toBe(hostInstance);
      expect(secondHostDirInstance.host).toBe(hostInstance);
    });

    it('should give precedence to the DI tokens from the host over the host directive tokens',
       () => {
         const token = new InjectionToken<string>('token');
         let hostInstance!: Host;
         let firstHostDirInstance!: FirstHostDir;
         let secondHostDirInstance!: SecondHostDir;

         @Directive({standalone: true, providers: [{provide: token, useValue: 'SecondDir'}]})
         class SecondHostDir {
           tokenValue = inject(token);

           constructor() {
             secondHostDirInstance = this;
           }
         }

         @Directive({
           standalone: true,
           hostDirectives: [SecondHostDir],
           providers: [{provide: token, useValue: 'FirstDir'}]
         } as HostDirectiveAny)
         class FirstHostDir {
           tokenValue = inject(token);

           constructor() {
             firstHostDirInstance = this;
           }
         }

         @Directive({
           selector: '[dir]',
           hostDirectives: [FirstHostDir],
           providers: [{provide: token, useValue: 'HostDir'}]
         } as HostDirectiveAny)
         class Host {
           tokenValue = inject(token);

           constructor() {
             hostInstance = this;
           }
         }

         @Component({template: '<div dir></div>'})
         class App {
         }

         TestBed.configureTestingModule({declarations: [App, Host]});
         const fixture = TestBed.createComponent(App);
         fixture.detectChanges();

         expect(hostInstance instanceof Host).toBe(true);
         expect(firstHostDirInstance instanceof FirstHostDir).toBe(true);
         expect(secondHostDirInstance instanceof SecondHostDir).toBe(true);

         expect(hostInstance.tokenValue).toBe('HostDir');
         expect(firstHostDirInstance.tokenValue).toBe('HostDir');
         expect(secondHostDirInstance.tokenValue).toBe('HostDir');
       });

    it('should allow the host to inject tokens from the host directives', () => {
      const firstToken = new InjectionToken<string>('firstToken');
      const secondToken = new InjectionToken<string>('secondToken');

      @Directive({standalone: true, providers: [{provide: secondToken, useValue: 'SecondDir'}]})
      class SecondHostDir {
      }

      @Directive({
        standalone: true,
        hostDirectives: [SecondHostDir],
        providers: [{provide: firstToken, useValue: 'FirstDir'}]
      } as HostDirectiveAny)
      class FirstHostDir {
      }

      @Directive({selector: '[dir]', hostDirectives: [FirstHostDir]} as HostDirectiveAny)
      class Host {
        firstTokenValue = inject(firstToken);
        secondTokenValue = inject(secondToken);
      }

      @Component({template: '<div dir></div>'})
      class App {
        @ViewChild(Host) host!: Host;
      }

      TestBed.configureTestingModule({declarations: [App, Host]});
      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();

      expect(fixture.componentInstance.host.firstTokenValue).toBe('FirstDir');
      expect(fixture.componentInstance.host.secondTokenValue).toBe('SecondDir');
    });

    it('should not give precedence to tokens from host directives over ones in viewProviders',
       () => {
         const token = new InjectionToken<string>('token');
         let tokenValue: string|undefined;

         @Directive({standalone: true, providers: [{provide: token, useValue: 'host-dir'}]})
         class HostDir {
         }

         @Component({
           selector: 'host',
           hostDirectives: [HostDir],
           providers: [{provide: token, useValue: 'host'}],
           template: '<span child></span>',
         } as HostDirectiveAny)
         class Host {
         }

         @Directive({selector: '[child]'})
         class Child {
           constructor() {
             tokenValue = inject(token);
           }
         }

         @Component({template: '<host></host>'})
         class App {
         }

         TestBed.configureTestingModule({declarations: [App, Host, Child]});
         const fixture = TestBed.createComponent(App);
         fixture.detectChanges();

         expect(tokenValue).toBe('host');
       });

    it('should not be able to access viewProviders from the host in the host directives', () => {
      const token = new InjectionToken<string>('token');
      let tokenValue: string|null = null;

      @Directive({standalone: true})
      class HostDir {
        constructor() {
          tokenValue = inject(token, {optional: true});
        }
      }

      @Component({
        selector: 'host',
        hostDirectives: [HostDir],
        viewProviders: [{provide: token, useValue: 'host'}],
        template: '',
      } as HostDirectiveAny)
      class Host {
      }

      @Component({template: '<host></host>'})
      class App {
      }

      TestBed.configureTestingModule({declarations: [App, Host]});
      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();

      expect(tokenValue).toBe(null);
    });

    it('should throw a circular dependency error if a host and a host directive inject each other',
       () => {
         @Directive({standalone: true})
         class HostDir {
           host = inject(Host);
         }

         @Directive({selector: '[dir]', hostDirectives: [HostDir]} as HostDirectiveAny)
         class Host {
           hostDir = inject(HostDir);
         }

         @Component({template: '<div dir></div>'})
         class App {
         }

         TestBed.configureTestingModule({declarations: [App, Host]});
         expect(() => TestBed.createComponent(App))
             .toThrowError(/NG0200: Circular dependency in DI detected for HostDir/);
       });
  });

  describe('debugging and testing utilities', () => {
    it('should be able to retrieve host directives using ng.getDirectives', () => {
      let hostDirInstance!: HostDir;
      let otherHostDirInstance!: OtherHostDir;
      let plainDirInstance!: PlainDir;

      @Directive({standalone: true})
      class HostDir {
        constructor() {
          hostDirInstance = this;
        }
      }

      @Directive({standalone: true})
      class OtherHostDir {
        constructor() {
          otherHostDirInstance = this;
        }
      }

      @Directive({selector: '[plain-dir]'})
      class PlainDir {
        constructor() {
          plainDirInstance = this;
        }
      }

      @Component({
        selector: 'comp',
        template: '',
        hostDirectives: [HostDir, OtherHostDir],
      } as HostDirectiveAny)
      class Comp {
      }

      @Component({template: '<comp plain-dir></comp>'})
      class App {
      }

      TestBed.configureTestingModule({declarations: [App, Comp, PlainDir]});
      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();
      const componentHost = fixture.nativeElement.querySelector('comp');

      expect(hostDirInstance instanceof HostDir).toBe(true);
      expect(otherHostDirInstance instanceof OtherHostDir).toBe(true);
      expect(plainDirInstance instanceof PlainDir).toBe(true);
      expect(getDirectives(componentHost)).toEqual([
        hostDirInstance, otherHostDirInstance, plainDirInstance
      ]);
    });

    it('should be able to retrieve components that have host directives using ng.getComponent',
       () => {
         let compInstance!: Comp;

         @Directive({standalone: true})
         class HostDir {
         }

         @Component({
           selector: 'comp',
           template: '',
           hostDirectives: [HostDir],
         } as HostDirectiveAny)
         class Comp {
           constructor() {
             compInstance = this;
           }
         }

         @Component({template: '<comp></comp>'})
         class App {
         }

         TestBed.configureTestingModule({declarations: [App, Comp]});
         const fixture = TestBed.createComponent(App);
         fixture.detectChanges();
         const componentHost = fixture.nativeElement.querySelector('comp');

         expect(compInstance instanceof Comp).toBe(true);
         expect(getComponent(componentHost)).toBe(compInstance);
       });

    it('should be able to retrieve components that have host directives using DebugNode.componentInstance',
       () => {
         let compInstance!: Comp;

         @Directive({standalone: true})
         class HostDir {
         }

         @Component({
           selector: 'comp',
           template: '',
           hostDirectives: [HostDir],
         } as HostDirectiveAny)
         class Comp {
           constructor() {
             compInstance = this;
           }
         }

         @Component({template: '<comp></comp>'})
         class App {
         }

         TestBed.configureTestingModule({declarations: [App, Comp]});
         const fixture = TestBed.createComponent(App);
         fixture.detectChanges();
         const node = fixture.debugElement.query(By.css('comp'));

         expect(compInstance instanceof Comp).toBe(true);
         expect(node.componentInstance).toBe(compInstance);
       });

    it('should be able to query by a host directive', () => {
      @Directive({standalone: true})
      class HostDir {
      }

      @Component({
        selector: 'comp',
        template: '',
        hostDirectives: [HostDir],
      } as HostDirectiveAny)
      class Comp {
        constructor(public elementRef: ElementRef<HTMLElement>) {}
      }

      @Component({template: '<comp></comp>'})
      class App {
        @ViewChild(Comp) compInstance!: Comp;
      }

      TestBed.configureTestingModule({declarations: [App, Comp]});
      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();
      const expected = fixture.componentInstance.compInstance.elementRef.nativeElement;
      const result = fixture.debugElement.query(By.directive(HostDir)).nativeElement;

      expect(result).toBe(expected);
    });
  });
});