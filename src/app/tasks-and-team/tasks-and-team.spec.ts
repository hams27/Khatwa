import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TasksAndTeam } from './tasks-and-team';

describe('TasksAndTeam', () => {
  let component: TasksAndTeam;
  let fixture: ComponentFixture<TasksAndTeam>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TasksAndTeam]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TasksAndTeam);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
