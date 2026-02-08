import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-layout',
  imports: [CommonModule,RouterLink],
  templateUrl: './layout.html',
  styleUrl: './layout.css',
})
export class Layout {
 step = 1;

  progress = 33;
  selectedStep: 'idea' | 'existing' | null = null;
  selectedGoal: string | null = null;
  selectedField: string | null = null;

  updateProgress() {
    this.progress = this.step * 33;
  }

  nextStep() {
    if (this.step === 1 && !this.selectedStep) {
      alert('اختر مرحلة المشروع');
      return;
    }

    if (this.step === 2 && !this.selectedGoal) {
      alert('اختر هدفك الأساسي');
      return;
    }

    if (this.step < 3) {
      this.step++;
      this.updateProgress();
    } else {
      console.log({
        stepType: this.selectedStep,
        goal: this.selectedGoal,
        field: this.selectedField
      });
    }
  }

  goBack() {
    if (this.step > 1) {
      this.step--;
      this.updateProgress();
    }
  }

  selectStep(step: 'idea' | 'existing') {
    this.selectedStep = step;
  }

  selectGoal(goal: string) {
    this.selectedGoal = goal;
  }

  selectField(field: string) {
    this.selectedField = field;
  }
}
