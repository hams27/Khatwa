import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface OnboardingAnalysisData {
  projectId: number;
  stage?: string;
  industry?: string;
  teamSize?: string;
  primaryGoal?: string;
  challenges?: string[];
  goals?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class AiService {
  private apiUrl = `${API_BASE_URL}/ai`;

  constructor(private http: HttpClient) {}

  // محادثة AI (Consultant)
  chat(projectId: number, message: string, history: any[] = []): Observable<any> {
    // Map history to backend format if needed
    const mappedHistory = history.map(msg => ({
      isUser: msg.role === 'user' || msg.isUser,
      text: msg.content || msg.text
    }));
    
    return this.http.post(`${this.apiUrl}/chat`, {
      projectId,
      message,
      history: mappedHistory
    });
  }

  // تحليل بيانات الـ Onboarding
  analyzeOnboarding(data: OnboardingAnalysisData): Observable<any> {
    return this.http.post(`${this.apiUrl}/onboarding-analysis`, data);
  }

  // توليد أفكار للمحتوى
  generateContentIdeas(projectId: number, platform?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/content-ideas`, { projectId, platform });
  }
}
