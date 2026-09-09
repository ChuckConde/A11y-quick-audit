import type { Framework } from './models';

/** Deliberately-flawed starter snippets so the tool has something to chew on. */
export const SAMPLE_CODE: Record<Framework, string> = {
  html: `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
</head>
<body>
  <div class="topbar">
    <a>Home</a>
    <a href="/pricing">Read more</a>
  </div>

  <h2>Delete your account</h2>

  <p>This action cannot be undone.</p>

  <form>
    <input type="text" placeholder="Type DELETE to confirm">
    <button>
      <img src="trash.svg">
    </button>
  </form>

  <div onclick="openMenu()" class="menu-trigger">Options</div>

  <img src="/promo.png">

  <a href="/report.pdf" target="_blank">Download the report</a>
</body>
</html>
`,

  angular: `<nav class="toolbar">
  <a (click)="goHome()">Home</a>
  <button (click)="save()">
    <i class="icon-save"></i>
  </button>
</nav>

<h3>Team members</h3>

<ul>
  @for (member of members(); track member.id) {
    <li>
      <img [src]="member.avatar">
      <span>{{ member.name }}</span>
      <div class="row-action" (click)="remove(member)">Remove</div>
    </li>
  }
</ul>

<form (ngSubmit)="invite()">
  <input type="email" [(ngModel)]="email" placeholder="Invite by email">
  <button type="submit">Send</button>
</form>

<div class="tooltip" (mouseover)="show()" (mouseout)="hide()">
  Hover for help
</div>
`,

  react: `export function InvoiceRow({ invoice, onDelete }) {
  return (
    <div className="invoice-row">
      <span>{invoice.number}</span>

      <img src={invoice.vendorLogo} />

      <a onClick={() => openInvoice(invoice.id)}>View</a>

      <div
        className="delete"
        onClick={() => onDelete(invoice.id)}
        tabIndex={3}
      >
        Delete
      </div>

      <input type="text" placeholder="Add a note" autoFocus />
    </div>
  );
}
`,
};
