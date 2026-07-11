import { Component, Input, inject } from '@angular/core';
import { NavigationHistoryService } from '../../services/navigation-history';

@Component({
  selector: 'app-back-button',
  imports: [],
  templateUrl: './back-button.html',
})
export class BackButton {
  private readonly history = inject(NavigationHistoryService);

  @Input({ required: true }) fallbackUrl!: string;
  @Input() label = 'Retour';

  goBack() {
    this.history.back(this.fallbackUrl);
  }
}
