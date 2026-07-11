import { Injectable, inject } from '@angular/core';
import { Location } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class NavigationHistoryService {
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private historyDepth = 0;

  constructor() {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) this.historyDepth++;
    });
  }

  back(fallbackUrl: string) {
    if (this.historyDepth > 1) {
      this.location.back();
    } else {
      this.router.navigateByUrl(fallbackUrl);
    }
  }
}
