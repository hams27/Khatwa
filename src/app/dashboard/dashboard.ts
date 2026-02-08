import { Component } from '@angular/core';
import { SideBar } from '../side-bar/side-bar';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';


interface Card {
  icon: string;
  title: string;
  description: string;
  progress: number;
  label: string;
}

@Component({
  selector: 'app-dashboard',
  imports: [SideBar,CommonModule,RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  showGuide = false;
  openGuide() {
  this.showGuide = true;
}

closeGuide() {
  this.showGuide = false;
}
 cards: Card[] = [
    {
      icon: '/graph-up-arrow.svg',
      title: 'أكمل خطتك التسويقية',
      description: 'أضف 3 منشورات لهذا الأسبوع',
      progress: 60,
      label: 'التقدم'
    },
    {
      icon: '/clipboard-data.svg',
      title: 'راجع تقريرك المالي',
      description: 'تحديث الإيرادات والمصروفات',
      progress: 80,
      label: 'التقدم'
    },
    {
      icon: '/stars.svg',
      title: 'تعلم مهارة جديدة',
      description: 'درس : كيف تكتب محتوى جذاب',
      progress: 0,
      label: 'التقدم'
    }
  ];
}
