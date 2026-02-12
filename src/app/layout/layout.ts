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
  
  // Current step tracker
  step: number = 1;
  
  // Step 1: Project Stage
  selectedStep: string = '';
  
  // Step 2: Main Goal
  selectedGoal: string = '';
  
  // Step 3: Business Field
  selectedField: string = '';
  
  // Step 4: Team Size
  selectedTeamSize: string = '';
  
  // Step 5: Current Challenges (multiple selection)
  challenges: string[] = [];
  
  // Step 6: Goals (multiple selection)
  goals: string[] = [];
  
  // Step 1 Functions
  selectStep(stepType: string) {
    this.selectedStep = stepType;
  }
  
  // Step 2 Functions
  selectGoal(goal: string) {
    this.selectedGoal = goal;
  }
  
  // Step 3 Functions
  selectField(field: string) {
    this.selectedField = field;
  }
  
  // Step 4 Functions
  selectTeamSize(size: string) {
    this.selectedTeamSize = size;
  }
  
  // Step 5 Functions - Toggle multiple challenges
  toggleChallenge(challenge: string) {
    const index = this.challenges.indexOf(challenge);
    if (index > -1) {
      // Remove if already selected
      this.challenges.splice(index, 1);
    } else {
      // Add if not selected
      this.challenges.push(challenge);
    }
  }
  
  // Step 6 Functions - Toggle multiple goals
  toggleGoal(goal: string) {
    const index = this.goals.indexOf(goal);
    if (index > -1) {
      // Remove if already selected
      this.goals.splice(index, 1);
    } else {
      // Add if not selected
      this.goals.push(goal);
    }
  }
  
  // Navigation Functions
  nextStep() {
    // Validation before moving to next step
    if (this.validateCurrentStep()) {
      this.step++;
      // Scroll to top when moving to next step
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Show error message
      this.showError();
    }
  }
  
  goBack() {
    if (this.step > 1) {
      this.step--;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
  
  // Validation
  validateCurrentStep(): boolean {
    switch(this.step) {
      case 1:
        return this.selectedStep !== '';
      case 2:
        return this.selectedGoal !== '';
      case 3:
        return this.selectedField !== '';
      case 4:
        return this.selectedTeamSize !== '';
      case 5:
        return this.challenges.length > 0;
      case 6:
        return this.goals.length > 0;
      default:
        return true;
    }
  }
  
  showError() {
    // You can implement a toast notification or alert here
    alert('الرجاء اختيار إجابة قبل المتابعة');
  }
  
  // Get all collected data
  getOnboardingData() {
    return {
      projectStage: this.selectedStep,
      mainGoal: this.selectedGoal,
      businessField: this.selectedField,
      teamSize: this.selectedTeamSize,
      challenges: this.challenges,
      goals: this.goals
    };
  }
  
  // Optional: Save data to service or API
  saveOnboardingData() {
    const data = this.getOnboardingData();
    console.log('Onboarding Data:', data);
    // Here you can send data to your backend API
    // this.onboardingService.saveData(data).subscribe(...);
  }
}

