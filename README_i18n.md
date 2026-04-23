# Ръководство за езиците и редакцията на текста

Този проект в момента използва две различни системи:

1. `react-i18next` за истински езикови низове, които трябва да се сменят между английски и български.
2. `Site Copy` inline editor за съдържание, което админът редактира визуално от сайта и се пази в `site_copy_entries`.

## Как работи смяната на езика

- Основната конфигурация е в `i18n.js`.
- Поддържаните езици в момента са `en` и `bg`.
- Изборът на език се пази в `localStorage` под ключ `lumina-language`.
- Ако потребителят не е избирал език ръчно, сайтът взима езика от браузъра.
- Footer бутоните с флагове сменят езика глобално за сайта веднага, без refresh.
- `react-i18next` текстовете се обновяват моментално.
- `Site Copy` текстовете също вече следват активния език.

## Кога да използвате `locales/*.json`

Използвайте `locales/en.json` и `locales/bg.json`, когато:

- текстът трябва да има отделен превод за всеки език;
- текстът е UI елемент, статус, бутон, helper label или кратък системен низ;
- текстът не трябва да се редактира свободно от inline admin editor-а.

### Пример за ръчен превод

В `locales/en.json`:

```json
{
   "copy_code": "Copy Code"
}
```

В `locales/bg.json`:

```json
{
   "copy_code": "Копирай кода"
}
```

После в компонент:

```jsx
import { useTranslation } from 'react-i18next';

export default function Example() {
   const { t } = useTranslation();

   return <button>{t('copy_code')}</button>;
}
```

## Кога да използвате `EditableText` или `EditableRichText`

Използвайте inline редактора, когато:

- искате да променяте текст направо от сайта;
- текстът е маркетингово съдържание, заглавие, описание или секция;
- искате админът да редактира съдържанието без промяна по кода.

### Разлика между двата типа

- `EditableText`: само текстово съдържание.
- `EditableRichText`: текст плюс тип блок, размер, alignment, style и други настройки.

## Как да редактирате текст от сайта

Това работи само ако сте админ и `site_copy_entries` е налична в Supabase.

1. Влезте като admin.
2. Изберете езика, който искате да редактирате от footer switcher-а.
2. В долния десен ъгъл включете `Edit Copy`.
3. Задръжте курсора върху текста, който искате да редактирате.
4. Натиснете бутона за редакция.
5. Направете промяната и натиснете `Save`.

Ако редактирате английски, записът се пази в основния ключ.

Ако редактирате български, системата автоматично пази отделна стойност за българския език и я използва веднага при смяна на езика.

## Как работи редакцията на product page

Product page вече има отделен `Site Copy` слой върху каталожните данни.

Това значи, че можете да отворите даден продукт и да редактирате визуално:

- името на продукта;
- subtitle и description;
- collection и category label-ите;
- tone / color label-ите;
- story текста;
- highlight bullet-ите;
- CTA текстовете и част от purchase flow copy-то.

Ключовете се генерират по slug на продукта.

Примери:

- `product.catalog.the-monaco-liquid-gold-aesthetic-top.name`
- `product.catalog.the-monaco-liquid-gold-aesthetic-top.description`
- `product.catalog.the-monaco-liquid-gold-aesthetic-top.collection`
- `product.catalog.the-monaco-liquid-gold-aesthetic-top.palette.gold`

Това е важно, защото:

- не се налага да променяте самата product таблица, за да имате BG версия;
- английската каталожна стойност остава fallback;
- българската версия може да се пази отделно през inline editor-а.

Ако на BG още виждате английски product текст, това не е бъг. Това означава, че за този конкретен product key още няма записана българска стойност и в момента се вижда fallback-ът.

## Как да редактирате заглавието на promo popup-а

Заглавието на popup-а вече е на `EditableRichText`, не на обикновен `EditableText`.

Това означава, че вече можете да променяте:

- самия текст;
- semantic type;
- размера;
- alignment;
- стилови настройки в рамките на rich text editor-а.

### Как да намалите размера на заглавието

1. Включете `Edit Copy`.
2. Отворете promo popup-а.
3. Кликнете върху заглавието.
4. В редактора сменете `Size` от `Display` към `XL`, `LG`, `Body`, `SM` или `XS`.
5. Натиснете `Save Content`.

## Важно ограничение в текущата архитектура

В момента не целият сайт е преведен през `react-i18next`.

Част от съдържанието още идва от `Site Copy`, което значи:

- смяната на езика работи правилно както за ключовете в `locales/*.json`, така и за locale-aware `Site Copy` записи;
- `Site Copy` вече може да има отделни EN и BG стойности;
- съдържание, което още не е преведено за дадения език, ще пада обратно към основната стойност.

## Практическо правило

- Ако текстът е кратък UI label, бутон, статус или системно съобщение: сложете го в `locales/en.json` и `locales/bg.json`.
- Ако текстът е секция от storefront-а, headline, body copy или popup content, който искате да редактирате визуално: използвайте `EditableText` или `EditableRichText`.

### Ако fallback-ът е директно в кода

Когато не искате да чакате нов `Site Copy` запис или нов ключ в `locales/*.json`, можете да подадете двуезичен fallback директно в компонента чрез `createLocalizedValue(en, bg)` от `utils/language.js`.

Пример:

```jsx
import { createLocalizedValue as localizedFallback } from '../utils/language';

<EditableText
   contentKey="cart.primary.continue_checkout"
   fallback={localizedFallback('Continue To Checkout', 'Продължи към checkout')}
   editorLabel="Cart continue checkout"
/>
```

Така:

- английският и българският fallback стоят в кода;
- `Site Copy` ключът остава същият;
- ако после редактирате текста inline от админ режима, системата пак ще пази отделно EN и BG стойности.

## Файлове, които управляват езиците

- `i18n.js`
- `locales/en.json`
- `locales/bg.json`
- `components/ClientEngine.jsx`

## Файлове, които управляват inline copy editor-а

- `components/site-copy/SiteCopyProvider.jsx`
- `components/site-copy/EditableText.jsx`
- `components/site-copy/EditableRichText.jsx`

## Следваща логична стъпка

Ако искате целият storefront да има истински EN/BG версии, трябва да решим едно от двете:

1. Да преместим повече текстове от `Site Copy` към `react-i18next`.
2. Да минем през основните страници и да добавим български стойности за `Site Copy` ключовете, които още ползват само fallback английски текст.