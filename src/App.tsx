import { useEffect } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { CookieBanner } from './components/CookieBanner';
import { IconSprite } from './components/Icons';
import { DEFAULT_COUNTRY, STORAGE_KEYS, findCountry } from './config';
import { LocaleProvider } from './i18n';
import { Home } from './pages/Home';
import { Legal } from './pages/Legal';
import { NotFound } from './pages/NotFound';
import { ProductPage } from './pages/ProductPage';
import { Products } from './pages/Products';
import { AdminPage } from './pages/AdminPage';
import { MerchantDashboard } from './pages/MerchantDashboard';
import { MerchantLogin } from './pages/MerchantLogin';
import { ShopsPage } from './pages/ShopsPage';

/** "/" goes to the visitor's last country, else a guess from the browser language, else Greece. */
function RootRedirect() {
  let code = DEFAULT_COUNTRY;
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.country);
    if (saved && findCountry(saved)) code = saved;
    else if (!navigator.language.toLowerCase().startsWith('el')) {
      const region = navigator.language.split('-')[1]?.toLowerCase();
      code = findCountry(region)?.code ?? DEFAULT_COUNTRY;
    }
  } catch { /* storage blocked */ }
  return <Navigate to={`/${code}`} replace />;
}

function CountryLayout() {
  const { country: code } = useParams();
  const country = findCountry(code);
  const { pathname } = useLocation();

  useEffect(() => {
    if (!country) return;
    document.documentElement.lang = country.lang;
    try { localStorage.setItem(STORAGE_KEYS.country, country.code); } catch { /* ignore */ }
  }, [country]);

  // New page: start at the top (results keep their place when only filters change).
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  if (!country) {
    return <LocaleProvider country={findCountry(DEFAULT_COUNTRY)!}><NotFound /></LocaleProvider>;
  }
  return (
    <LocaleProvider country={country}>
      <Outlet />
      <CookieBanner />
    </LocaleProvider>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <IconSprite />
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/:country" element={<CountryLayout />}>
          <Route index element={<Home />} />
          <Route path="products" element={<Products />} />
          <Route path="products/:groupId/variant/:id" element={<ProductPage />} />
          <Route path="pages/privacy-policy" element={<Legal kind="privacy" />} />
          <Route path="pages/cookies-policy" element={<Legal kind="cookies" />} />
          <Route path="shops" element={<ShopsPage />} />
          <Route path="merchant" element={<MerchantDashboard />} />
          <Route path="merchant/login" element={<MerchantLogin />} />
          <Route path="admin" element={<AdminPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

