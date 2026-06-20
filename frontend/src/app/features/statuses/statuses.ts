import { Component } from '@angular/core';

@Component({
  selector: 'app-statuses',
  imports: [],
  templateUrl: './statuses.html',
  styleUrl: './statuses.scss',
})
export class Statuses {
  statuses = [
    { id: '1', name: 'Alice Martin',   initials: 'AM', color: 'linear-gradient(135deg,#ec4899,#f43f5e)', time: 'Il y a 1h',  expires: '23h',  seen: false },
    { id: '2', name: 'Clara Fontaine', initials: 'CF', color: 'linear-gradient(135deg,#22c55e,#10b981)', time: 'Il y a 3h',  expires: '21h',  seen: false },
    { id: '3', name: 'Emma Rousseau',  initials: 'ER', color: 'linear-gradient(135deg,#8b5cf6,#a855f7)', time: 'Il y a 8h',  expires: '16h',  seen: true },
    { id: '4', name: 'David Leclerc',  initials: 'DL', color: 'linear-gradient(135deg,#f97316,#f59e0b)', time: 'Il y a 12h', expires: '12h',  seen: true },
  ];
}
