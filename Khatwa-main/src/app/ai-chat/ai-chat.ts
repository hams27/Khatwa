import { Component, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface ChatMessage {
  text: string;
  isUser: boolean;
  time: string;
}

@Component({
  selector: 'app-ai-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ai-chat.html',
  styleUrl: './ai-chat.css'
})
export class AiChatComponent implements AfterViewChecked {

  @ViewChild('messagesContainer') messagesContainer!: ElementRef;

  isChatOpen = false;
  hasNewMessage = true;
  inputText = '';
  isTyping = false;
  messages: ChatMessage[] = [];

  // ردود تلقائية مؤقتة لحين ربط الـ AI الحقيقي
  private botReplies: { [key: string]: string } = {
    'default': 'شكراً على سؤالك! فريقنا سيتواصل معك قريباً. في الوقت الحالي يمكنك تصفح المنصة والتعرف على مميزاتها.',
    'مجاني': 'نعم! خطوة مجانية ١٠٠٪ للبدء. يمكنك التسجيل الآن والاستمتاع بجميع الميزات الأساسية بدون أي رسوم.',
    'مميزات': 'خطوة توفر لك: إدارة المهام، تحليلات متقدمة، تسويق مستهدف، إدارة مالية، ومجتمع رواد الأعمال. كل ما يحتاجه مشروعك في مكان واحد!',
    'مشروع': 'رائع! ابدأ بإنشاء حساب مجاني، ثم أخبرنا عن مشروعك وسنُعدّ كل شيء لك في دقيقتين فقط. انقر على "ابدأ مجاناً" للبدء!',
    'تسجيل': 'التسجيل سهل وسريع! انقر على زر "ابدأ مجاناً" في أعلى الصفحة وأدخل بياناتك الأساسية. لا تحتاج بطاقة ائتمان.',
  };

  toggleChat() {
    this.isChatOpen = !this.isChatOpen;
    if (this.isChatOpen) {
      this.hasNewMessage = false;
    }
  }

  sendQuickMessage(text: string) {
    this.inputText = text;
    this.sendMessage();
  }

  sendMessage() {
    const text = this.inputText.trim();
    if (!text || this.isTyping) return;

    // إضافة رسالة المستخدم
    this.messages.push({
      text,
      isUser: true,
      time: this.getTime()
    });
    this.inputText = '';

    // إظهار مؤشر الكتابة
    this.isTyping = true;

    // رد الـ Bot بعد تأخير
    setTimeout(() => {
      const reply = this.getBotReply(text);
      this.messages.push({
        text: reply,
        isUser: false,
        time: this.getTime()
      });
      this.isTyping = false;
    }, 1200 + Math.random() * 800);
  }

  private getBotReply(userText: string): string {
    const lowerText = userText.toLowerCase();
    for (const key of Object.keys(this.botReplies)) {
      if (key !== 'default' && lowerText.includes(key)) {
        return this.botReplies[key];
      }
    }
    return this.botReplies['default'];
  }

  private getTime(): string {
    const now = new Date();
    return `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
  }

  ngAfterViewChecked() {
    // تمرير للأسفل تلقائياً عند وصول رسالة جديدة
    this.scrollToBottom();
  }

  private scrollToBottom() {
    try {
      const el = this.messagesContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch {}
  }
}