// Zlato Aurelius – sdílené styly

export const STYLES = `
  :root {
    --green: #006039;
    --black: #000000;
    --white: #ffffff;
    --grey: #f4f4f2;
    --border: #e2e2de;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    background: var(--white);
    color: var(--black);
    line-height: 1.55;
  }
  header {
    border-bottom: 1px solid var(--border);
    padding: 28px 24px;
  }
  .wrap { max-width: 720px; margin: 0 auto; }
  .logo {
    font-size: 13px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    font-weight: 600;
    color: var(--green);
  }
  h1 { font-size: 30px; font-weight: 600; margin: 40px 0 8px; letter-spacing: -0.01em; }
  .lead { color: #555; margin: 0 0 36px; }
  main { padding: 0 24px 80px; }
  label {
    display: block;
    font-size: 13px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 8px;
    color: #333;
  }
  select, input {
    width: 100%;
    padding: 15px 14px;
    font-size: 17px;
    border: 1px solid var(--border);
    border-radius: 2px;
    background: var(--white);
    color: var(--black);
    font-family: inherit;
  }
  select:focus, input:focus {
    outline: none;
    border-color: var(--green);
    box-shadow: 0 0 0 3px rgba(0, 96, 57, 0.12);
  }
  .field { margin-bottom: 22px; }
  .row { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
  .toggle { display: flex; gap: 0; border: 1px solid var(--border); border-radius: 2px; overflow: hidden; }
  .toggle button {
    flex: 1;
    padding: 14px;
    font-size: 15px;
    font-family: inherit;
    border: 0;
    background: var(--white);
    color: #555;
    cursor: pointer;
  }
  .toggle button.active { background: var(--green); color: var(--white); font-weight: 600; }
  .result {
    margin-top: 36px;
    border: 1px solid var(--border);
    border-top: 3px solid var(--green);
    padding: 30px 26px;
    background: var(--grey);
  }
  .price { font-size: 42px; font-weight: 600; color: var(--green); letter-spacing: -0.02em; }
  .detail { margin-top: 18px; font-size: 14px; color: #555; }
  .detail div { display: flex; justify-content: space-between; padding: 7px 0; border-top: 1px solid var(--border); }
  .note { margin-top: 26px; font-size: 13px; color: #666; border-left: 2px solid var(--green); padding-left: 14px; }
  .err { color: #a00; margin-top: 16px; font-size: 14px; }
  button.primary {
    background: var(--green);
    color: var(--white);
    border: 0;
    padding: 16px 30px;
    font-size: 16px;
    font-family: inherit;
    font-weight: 600;
    border-radius: 2px;
    cursor: pointer;
  }
  table { width: 100%; border-collapse: collapse; margin-bottom: 28px; }
  th, td { text-align: left; padding: 12px 10px; border-bottom: 1px solid var(--border); font-size: 15px; }
  th { font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #555; }
  td input { padding: 10px; font-size: 15px; }
  @media (max-width: 560px) {
    .row { grid-template-columns: 1fr; }
    h1 { font-size: 25px; }
    .price { font-size: 34px; }
  }
`;
