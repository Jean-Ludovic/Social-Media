import { Component } from '@angular/core';

@Component({
  selector: 'app-debate-detail',
  imports: [],
  templateUrl: './debate-detail.html',
  styleUrl: './debate-detail.scss',
})
export class DebateDetail {
  sides = [
    { label: 'Pour',    pct: 58, votes: 198 },
    { label: 'Contre',  pct: 42, votes: 144 },
  ];
}
