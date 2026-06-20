import { Component } from '@angular/core';

@Component({
  selector: 'app-friends',
  imports: [],
  templateUrl: './friends.html',
  styleUrl: './friends.scss',
})
export class Friends {
  requests = [
    { id: '1', name: 'Marie Leconte',  initials: 'ML', color: 'linear-gradient(135deg,#ec4899,#f43f5e)', mutual: 3 },
    { id: '2', name: 'Pierre Garnier', initials: 'PG', color: 'linear-gradient(135deg,#3b82f6,#06b6d4)', mutual: 7 },
  ];
  friends = [
    { id: '1', name: 'Alice Martin',   initials: 'AM', color: 'linear-gradient(135deg,#ec4899,#f43f5e)', online: true },
    { id: '2', name: 'Bob Dupont',     initials: 'BD', color: 'linear-gradient(135deg,#3b82f6,#06b6d4)', online: false },
    { id: '3', name: 'Clara Fontaine', initials: 'CF', color: 'linear-gradient(135deg,#22c55e,#10b981)', online: true },
    { id: '4', name: 'David Leclerc',  initials: 'DL', color: 'linear-gradient(135deg,#f97316,#f59e0b)', online: false },
  ];
}
