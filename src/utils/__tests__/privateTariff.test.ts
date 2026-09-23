import { parsePrivatePrice } from '../privateTariff';

describe('importes de tarifas', () => {
  it.each([['50,50',5050],['50.50',5050],['0',0],['0,00',0],[' 7,5 ',750],['21474836,47',2147483647]])('conserva %s en céntimos', (text, cents) => {
    expect(parsePrivatePrice(String(text))).toBe(cents);
  });
  it.each(['',' ', '-1','50,505','50.505','50,','1.000,00','1e2','NaN','21474836,48'])('rechaza %s sin convertirlo', text => {
    expect(parsePrivatePrice(text)).toBeNull();
  });
});
