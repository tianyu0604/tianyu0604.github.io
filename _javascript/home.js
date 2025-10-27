import { basic, initSidebar, initTopbar } from './modules/layouts';
import {
  initLocaleDatetime,
  loadImg,
  initDailyQuote
} from './modules/components';

loadImg();
initLocaleDatetime();
initSidebar();
initTopbar();
initDailyQuote();
basic();
