// UI translations, keyed by the English string. One row per string:
// [en, Français, Español, Deutsch, Italiano, Português, العربية, 日本語].
// t(s) falls back to English for anything missing, so untranslated strings
// (catalog labels, clip ids, diagnostics) render unchanged.
import { useMemo } from "react";
import { getSettings, useSettings } from "./settings";

const ROWS: string[][] = [
  // nav + status
  ["Chat", "Discussion", "Chat", "Chat", "Chat", "Conversa", "الدردشة", "チャット"],
  ["Wardrobe", "Garde-robe", "Vestuario", "Garderobe", "Guardaroba", "Guarda-roupa", "الملابس", "ワードローブ"],
  ["Test", "Test", "Prueba", "Test", "Prova", "Teste", "تجربة", "テスト"],
  ["Settings", "Réglages", "Ajustes", "Einstellungen", "Impostazioni", "Definições", "الإعدادات", "設定"],
  ["Hold to talk", "Maintenir pour parler", "Mantén para hablar", "Zum Sprechen halten", "Tieni premuto per parlare", "Segure para falar", "اضغط مطولاً للتحدث", "長押しで話す"],
  ["Listening…", "Écoute…", "Escuchando…", "Höre zu…", "In ascolto…", "A ouvir…", "يستمع…", "聞いています…"],
  ["Thinking…", "Réflexion…", "Pensando…", "Denke nach…", "Sto pensando…", "A pensar…", "يفكر…", "考え中…"],
  ["Speaking…", "Parle…", "Hablando…", "Spreche…", "Sta parlando…", "A falar…", "يتحدث…", "話しています…"],
  ["You", "Toi", "Tú", "Du", "Tu", "Você", "أنت", "あなた"],
  ["Hold the mic or type", "Micro ou clavier", "Mantén el micro o escribe", "Mikro halten oder tippen", "Tieni il micro o scrivi", "Segure o micro ou escreva", "اضغط على الميكروفون أو اكتب", "マイク長押しか入力"],
  ["Say hi to Aura — hold the mic, or type.", "Dis bonjour à Aura — maintiens le micro, ou écris.", "Saluda a Aura: mantén el micro o escribe.", "Sag Hallo zu Aura — Mikro halten oder tippen.", "Saluta Aura: tieni premuto il micro o scrivi.", "Diga olá à Aura — segure o micro ou escreva.", "رحّب بأورا — اضغط على الميكروفون أو اكتب.", "Auraに挨拶しよう — マイク長押しか入力。"],
  ["Your avatar, alive.", "Ton avatar, vivant.", "Tu avatar, vivo.", "Dein Avatar, lebendig.", "Il tuo avatar, vivo.", "O seu avatar, vivo.", "صورتك الرمزية، حيّة.", "あなたのアバターが、生きている。"],
  // onboarding
  ["A twin from one selfie", "Un jumeau d'un selfie", "Un gemelo de una selfie", "Ein Zwilling aus einem Selfie", "Un gemello da un selfie", "Um gémeo de uma selfie", "توأم من سيلفي واحدة", "自撮り1枚で分身を"],
  ["Upload a photo and Aura builds a realistic, animated avatar of you.", "Envoie une photo et Aura crée un avatar réaliste et animé de toi.", "Sube una foto y Aura crea un avatar realista y animado de ti.", "Lade ein Foto hoch und Aura erstellt einen realistischen, animierten Avatar von dir.", "Carica una foto e Aura crea un avatar realistico e animato di te.", "Envie uma foto e a Aura cria um avatar realista e animado de você.", "ارفع صورة وستنشئ أورا صورة رمزية واقعية ومتحركة لك.", "写真をアップすると、Auraがリアルに動くアバターを作ります。"],
  ["Talk like you'd talk", "Parle naturellement", "Habla como hablas", "Sprich ganz natürlich", "Parla come parli", "Fale como você fala", "تحدث بطبيعتك", "いつも通りに話そう"],
  ["Hold to speak. Your avatar listens, thinks, answers — and smiles back.", "Maintiens pour parler. Ton avatar écoute, réfléchit, répond — et te sourit.", "Mantén para hablar. Tu avatar escucha, piensa, responde y te sonríe.", "Halte zum Sprechen. Dein Avatar hört zu, denkt, antwortet — und lächelt zurück.", "Tieni premuto per parlare. Il tuo avatar ascolta, pensa, risponde — e sorride.", "Segure para falar. Seu avatar ouve, pensa, responde — e sorri de volta.", "اضغط مطولاً للتحدث. صورتك الرمزية تستمع وتفكر وتجيب — وتبتسم لك.", "長押しで話すと、アバターが聞いて、考えて、答えて、微笑み返します。"],
  ["Make it yours", "Personnalise-le", "Hazlo tuyo", "Mach ihn zu deinem", "Rendilo tuo", "Deixe com a sua cara", "اجعلها لك", "自分らしく"],
  ["Hair, clothes, colors, expressions, animations, and voice.", "Cheveux, vêtements, couleurs, expressions, animations et voix.", "Pelo, ropa, colores, expresiones, animaciones y voz.", "Haare, Kleidung, Farben, Ausdrücke, Animationen und Stimme.", "Capelli, vestiti, colori, espressioni, animazioni e voce.", "Cabelo, roupas, cores, expressões, animações e voz.", "الشعر والملابس والألوان والتعابير والحركات والصوت.", "髪、服、色、表情、アニメ、声。"],
  ["It remembers you", "Il se souvient de toi", "Te recuerda", "Er erinnert sich an dich", "Si ricorda di te", "Ele lembra de você", "تتذكرك", "あなたを覚えている"],
  ["Conversations carry over. Your companion grows with you.", "Les conversations continuent. Ton compagnon grandit avec toi.", "Las conversaciones continúan. Tu compañero crece contigo.", "Gespräche bleiben erhalten. Dein Begleiter wächst mit dir.", "Le conversazioni continuano. Il tuo compagno cresce con te.", "As conversas continuam. Seu companheiro cresce com você.", "المحادثات تستمر. رفيقك ينمو معك.", "会話は引き継がれ、相棒は一緒に成長します。"],
  ["Skip", "Passer", "Saltar", "Überspringen", "Salta", "Pular", "تخطي", "スキップ"],
  ["Continue", "Continuer", "Continuar", "Weiter", "Continua", "Continuar", "متابعة", "次へ"],
  ["Create my avatar", "Créer mon avatar", "Crear mi avatar", "Meinen Avatar erstellen", "Crea il mio avatar", "Criar meu avatar", "إنشاء صورتي الرمزية", "アバターを作る"],
  // creation
  ["Create your avatar", "Crée ton avatar", "Crea tu avatar", "Erstelle deinen Avatar", "Crea il tuo avatar", "Crie seu avatar", "أنشئ صورتك الرمزية", "アバターを作成"],
  ["Add a clear, front-facing selfie in good light — Aura builds an avatar that looks like you.", "Ajoute un selfie net, de face et bien éclairé — Aura crée un avatar qui te ressemble.", "Añade una selfie clara, de frente y con buena luz: Aura crea un avatar que se parece a ti.", "Füge ein klares, frontales Selfie bei gutem Licht hinzu — Aura erstellt einen Avatar, der dir ähnelt.", "Aggiungi un selfie nitido, frontale e ben illuminato — Aura crea un avatar che ti somiglia.", "Adicione uma selfie nítida, de frente e com boa luz — a Aura cria um avatar parecido com você.", "أضف سيلفي واضحة من الأمام وبإضاءة جيدة — وستنشئ أورا صورة رمزية تشبهك.", "明るい場所で正面から撮った自撮りを追加すると、あなたに似たアバターを作ります。"],
  ["Tap to add a selfie", "Touche pour ajouter un selfie", "Toca para añadir una selfie", "Tippen, um ein Selfie hinzuzufügen", "Tocca per aggiungere un selfie", "Toque para adicionar uma selfie", "اضغط لإضافة سيلفي", "タップして自撮りを追加"],
  ["Front-facing · good lighting", "De face · bonne lumière", "De frente · buena luz", "Frontal · gutes Licht", "Frontale · buona luce", "De frente · boa luz", "من الأمام · إضاءة جيدة", "正面 · 明るい場所で"],
  ["Photo ready", "Photo prête", "Foto lista", "Foto bereit", "Foto pronta", "Foto pronta", "الصورة جاهزة", "写真OK"],
  ["Generate my avatar", "Générer mon avatar", "Generar mi avatar", "Avatar generieren", "Genera il mio avatar", "Gerar meu avatar", "توليد صورتي الرمزية", "アバターを生成"],
  ["Skip for now", "Plus tard", "Ahora no", "Später", "Non ora", "Agora não", "لاحقاً", "あとで"],
  ["Analyzing face", "Analyse du visage", "Analizando el rostro", "Gesicht wird analysiert", "Analisi del viso", "Analisando o rosto", "تحليل الوجه", "顔を分析中"],
  ["Extracting features", "Extraction des traits", "Extrayendo rasgos", "Merkmale werden erfasst", "Estrazione dei tratti", "Extraindo traços", "استخراج الملامح", "特徴を抽出中"],
  ["Building your head", "Construction du visage", "Construyendo tu cabeza", "Kopf wird erstellt", "Costruzione della testa", "Construindo sua cabeça", "بناء الرأس", "頭部を作成中"],
  ["Matching identity", "Ajustement de l'identité", "Ajustando la identidad", "Identität wird abgeglichen", "Corrispondenza dell'identità", "Ajustando a identidade", "مطابقة الهوية", "特徴を照合中"],
  ["Preparing voice", "Préparation de la voix", "Preparando la voz", "Stimme wird vorbereitet", "Preparazione della voce", "Preparando a voz", "تجهيز الصوت", "声を準備中"],
  ["Almost ready", "Presque prêt", "Casi listo", "Fast fertig", "Quasi pronto", "Quase pronto", "أوشكنا على الانتهاء", "まもなく完成"],
  ["Analysis unavailable — using a default avatar.", "Analyse indisponible — avatar par défaut utilisé.", "Análisis no disponible: se usará un avatar predeterminado.", "Analyse nicht verfügbar — Standard-Avatar wird verwendet.", "Analisi non disponibile — verrà usato un avatar predefinito.", "Análise indisponível — usando um avatar padrão.", "التحليل غير متاح — سيتم استخدام صورة رمزية افتراضية.", "分析できません — 標準のアバターを使います。"],
  // wardrobe
  ["All", "Tout", "Todo", "Alle", "Tutto", "Tudo", "الكل", "すべて"],
  ["Color", "Couleur", "Color", "Farbe", "Colore", "Cor", "اللون", "色"],
  ["Reset", "Réinitialiser", "Restablecer", "Zurücksetzen", "Ripristina", "Repor", "إعادة تعيين", "リセット"],
  ["Done", "Terminé", "Listo", "Fertig", "Fatto", "Concluído", "تم", "完了"],
  ["Start the backend on :8100 to load the wardrobe.", "Lance le backend sur :8100 pour charger la garde-robe.", "Inicia el backend en :8100 para cargar el vestuario.", "Starte das Backend auf :8100, um die Garderobe zu laden.", "Avvia il backend su :8100 per caricare il guardaroba.", "Inicie o backend na porta :8100 para carregar o guarda-roupa.", "شغّل الخادم على ‎:8100 لتحميل الملابس.", "バックエンド(:8100)を起動するとワードローブを読み込めます。"],
  // settings
  ["Dark theme", "Thème sombre", "Tema oscuro", "Dunkles Design", "Tema scuro", "Tema escuro", "الوضع الداكن", "ダークテーマ"],
  ["Graphics quality", "Qualité graphique", "Calidad gráfica", "Grafikqualität", "Qualità grafica", "Qualidade gráfica", "جودة الرسومات", "画質"],
  ["Low", "Basse", "Baja", "Niedrig", "Bassa", "Baixa", "منخفضة", "低"],
  ["Medium", "Moyenne", "Media", "Mittel", "Media", "Média", "متوسطة", "中"],
  ["High", "Haute", "Alta", "Hoch", "Alta", "Alta", "عالية", "高"],
  ["Longest battery", "Batterie maximale", "Más batería", "Längste Akkulaufzeit", "Più batteria", "Mais bateria", "أطول عمر للبطارية", "電池優先"],
  ["Balanced", "Équilibrée", "Equilibrada", "Ausgewogen", "Bilanciata", "Equilibrada", "متوازنة", "バランス"],
  ["Sharpest", "La plus nette", "Más nítida", "Am schärfsten", "Più nitida", "Mais nítida", "الأكثر وضوحاً", "最高画質"],
  ["Language", "Langue", "Idioma", "Sprache", "Lingua", "Idioma", "اللغة", "言語"],
  ["Voice", "Voix", "Voz", "Stimme", "Voce", "Voz", "الصوت", "声"],
  ["Privacy", "Confidentialité", "Privacidad", "Datenschutz", "Privacy", "Privacidade", "الخصوصية", "プライバシー"],
  ["Export avatar", "Exporter l'avatar", "Exportar avatar", "Avatar exportieren", "Esporta avatar", "Exportar avatar", "تصدير الصورة الرمزية", "アバターを書き出す"],
  ["Subscription", "Abonnement", "Suscripción", "Abo", "Abbonamento", "Assinatura", "الاشتراك", "サブスクリプション"],
  ["About", "À propos", "Acerca de", "Info", "Informazioni", "Sobre", "حول", "情報"],
  ["Delete avatar", "Supprimer l'avatar", "Eliminar avatar", "Avatar löschen", "Elimina avatar", "Excluir avatar", "حذف الصورة الرمزية", "アバターを削除"],
  ["Free", "Gratuit", "Gratis", "Kostenlos", "Gratuito", "Grátis", "مجاني", "無料"],
  ["Aura replies — text and voice — in this language.", "Aura répond — texte et voix — dans cette langue.", "Aura responde, en texto y voz, en este idioma.", "Aura antwortet — Text und Stimme — in dieser Sprache.", "Aura risponde — testo e voce — in questa lingua.", "A Aura responde — texto e voz — neste idioma.", "تجيب أورا — نصاً وصوتاً — بهذه اللغة.", "Auraはこの言語でテキストも音声も返答します。"],
  ["Tap a voice to select and hear it.", "Touche une voix pour la choisir et l'écouter.", "Toca una voz para elegirla y escucharla.", "Tippe auf eine Stimme, um sie zu wählen und anzuhören.", "Tocca una voce per sceglierla e ascoltarla.", "Toque numa voz para escolher e ouvir.", "اضغط على صوت لاختياره وسماعه.", "タップして声を選んで試聴。"],
  ["Deep · warm", "Grave · chaleureuse", "Grave · cálida", "Tief · warm", "Profonda · calda", "Grave · quente", "عميق · دافئ", "低め · 温かい"],
  ["Bright · clear", "Claire · nette", "Brillante · clara", "Hell · klar", "Brillante · chiara", "Clara · nítida", "مشرق · واضح", "明るい · クリア"],
  ["Balanced · neutral", "Équilibrée · neutre", "Equilibrada · neutra", "Ausgewogen · neutral", "Bilanciata · neutra", "Equilibrada · neutra", "متوازن · محايد", "バランス · 中立"],
  ["Storyteller · British", "Conteur · britannique", "Narrador · británico", "Erzähler · britisch", "Narratore · britannico", "Contador · britânico", "راوٍ · بريطاني", "語り部 · 英国風"],
  ["Warm · feminine", "Chaleureuse · féminine", "Cálida · femenina", "Warm · weiblich", "Calda · femminile", "Quente · feminina", "دافئ · أنثوي", "温かい · 女性的"],
  ["Soft · airy", "Douce · légère", "Suave · ligera", "Sanft · luftig", "Morbida · leggera", "Suave · leve", "ناعم · خفيف", "やわらか · 軽やか"],
  ["Microphone", "Microphone", "Micrófono", "Mikrofon", "Microfono", "Microfone", "الميكروفون", "マイク"],
  ["Only records while you hold the mic button. Nothing listens in the background.", "N'enregistre que lorsque tu maintiens le bouton micro. Rien n'écoute en arrière-plan.", "Solo graba mientras mantienes el botón del micro. Nada escucha en segundo plano.", "Nimmt nur auf, während du die Mikrotaste hältst. Nichts hört im Hintergrund mit.", "Registra solo mentre tieni premuto il pulsante del micro. Nulla ascolta in background.", "Grava apenas enquanto você segura o botão do micro. Nada escuta em segundo plano.", "يسجل فقط أثناء ضغطك على زر الميكروفون. لا شيء يستمع في الخلفية.", "マイクボタンを押している間だけ録音します。バックグラウンドでは何も聞きません。"],
  ["Voice & chat", "Voix et discussion", "Voz y chat", "Stimme & Chat", "Voce e chat", "Voz e conversa", "الصوت والدردشة", "音声とチャット"],
  ["Sent to your Aura backend, which uses OpenAI to transcribe, reply, and speak. Conversations are not stored — closing the chat clears them.", "Envoyés à ton backend Aura, qui utilise OpenAI pour transcrire, répondre et parler. Les conversations ne sont pas stockées — fermer la discussion les efface.", "Se envían a tu backend de Aura, que usa OpenAI para transcribir, responder y hablar. Las conversaciones no se guardan: cerrar el chat las borra.", "Wird an dein Aura-Backend gesendet, das OpenAI zum Transkribieren, Antworten und Sprechen nutzt. Gespräche werden nicht gespeichert — Schließen des Chats löscht sie.", "Inviati al tuo backend Aura, che usa OpenAI per trascrivere, rispondere e parlare. Le conversazioni non vengono salvate — chiudere la chat le cancella.", "Enviados ao seu backend Aura, que usa OpenAI para transcrever, responder e falar. As conversas não são guardadas — fechar o chat as apaga.", "تُرسل إلى خادم أورا الذي يستخدم OpenAI للنسخ والرد والتحدث. المحادثات لا تُخزن — إغلاق الدردشة يمسحها.", "Auraバックエンドに送られ、OpenAIで文字起こし・返答・発話します。会話は保存されず、チャットを閉じると消えます。"],
  ["Photos", "Photos", "Fotos", "Fotos", "Foto", "Fotos", "الصور", "写真"],
  ["A selfie is analyzed once to shape your avatar, then discarded. Only the resulting slider values are kept.", "Un selfie est analysé une fois pour façonner ton avatar, puis supprimé. Seules les valeurs des curseurs sont conservées.", "La selfie se analiza una vez para dar forma a tu avatar y luego se descarta. Solo se guardan los valores resultantes.", "Ein Selfie wird einmal analysiert, um deinen Avatar zu formen, und dann verworfen. Nur die resultierenden Reglerwerte bleiben.", "Un selfie viene analizzato una volta per modellare il tuo avatar, poi eliminato. Restano solo i valori risultanti.", "A selfie é analisada uma vez para moldar seu avatar e depois descartada. Só os valores resultantes são mantidos.", "تُحلل السيلفي مرة واحدة لتشكيل صورتك الرمزية ثم تُحذف. تُحفظ القيم الناتجة فقط.", "自撮りはアバター作成のため1回だけ分析され、その後破棄されます。残るのは数値だけです。"],
  ["On this device", "Sur cet appareil", "En este dispositivo", "Auf diesem Gerät", "Su questo dispositivo", "Neste dispositivo", "على هذا الجهاز", "この端末では"],
  ["Your avatar, outfit, voice and settings live in this app's local storage only.", "Ton avatar, ta tenue, ta voix et tes réglages restent uniquement dans le stockage local de l'app.", "Tu avatar, ropa, voz y ajustes viven solo en el almacenamiento local de esta app.", "Dein Avatar, Outfit, Stimme und Einstellungen liegen nur im lokalen Speicher dieser App.", "Avatar, outfit, voce e impostazioni restano solo nella memoria locale dell'app.", "Seu avatar, roupa, voz e definições ficam apenas no armazenamento local do app.", "صورتك الرمزية وملابسك وصوتك وإعداداتك تبقى في التخزين المحلي للتطبيق فقط.", "アバター・服装・声・設定はこのアプリ内にのみ保存されます。"],
  ["CURRENT PLAN", "FORMULE ACTUELLE", "PLAN ACTUAL", "AKTUELLER TARIF", "PIANO ATTUALE", "PLANO ATUAL", "الخطة الحالية", "現在のプラン"],
  ["Everything works: avatar from a selfie, wardrobe, voice chat with live lip-sync, and the full animation library.", "Tout est inclus : avatar depuis un selfie, garde-robe, discussion vocale avec lip-sync en direct et toute la bibliothèque d'animations.", "Todo funciona: avatar desde una selfie, vestuario, chat de voz con lip-sync en vivo y toda la biblioteca de animaciones.", "Alles funktioniert: Avatar aus einem Selfie, Garderobe, Sprachchat mit Live-Lippensynchronisation und die volle Animationsbibliothek.", "Tutto funziona: avatar da un selfie, guardaroba, chat vocale con lip-sync dal vivo e l'intera libreria di animazioni.", "Tudo funciona: avatar a partir de uma selfie, guarda-roupa, chat de voz com lip-sync ao vivo e toda a biblioteca de animações.", "كل شيء متاح: صورة رمزية من سيلفي، ملابس، دردشة صوتية بمزامنة شفاه مباشرة، ومكتبة الحركات كاملة.", "自撮りからのアバター、ワードローブ、リップシンク付き音声チャット、全アニメーションが使えます。"],
  ["Cloud avatar backup, more voices, exclusive wardrobe drops, and longer conversations.", "Sauvegarde cloud de l'avatar, plus de voix, tenues exclusives et conversations plus longues.", "Copia de seguridad en la nube, más voces, ropa exclusiva y conversaciones más largas.", "Cloud-Backup des Avatars, mehr Stimmen, exklusive Outfits und längere Gespräche.", "Backup cloud dell'avatar, più voci, capi esclusivi e conversazioni più lunghe.", "Backup do avatar na nuvem, mais vozes, roupas exclusivas e conversas mais longas.", "نسخ احتياطي سحابي للصورة الرمزية، أصوات إضافية، ملابس حصرية ومحادثات أطول.", "クラウドバックアップ、追加ボイス、限定ワードローブ、長い会話。"],
  ["Coming soon", "Bientôt disponible", "Próximamente", "Bald verfügbar", "In arrivo", "Em breve", "قريباً", "近日公開"],
  ["Backend", "Backend", "Backend", "Backend", "Backend", "Backend", "الخادم", "バックエンド"],
  ["Connected", "Connecté", "Conectado", "Verbunden", "Connesso", "Conectado", "متصل", "接続済み"],
  ["Offline", "Hors ligne", "Sin conexión", "Offline", "Offline", "Offline", "غير متصل", "オフライン"],
  ["Checking…", "Vérification…", "Comprobando…", "Prüfe…", "Verifica…", "A verificar…", "جارٍ التحقق…", "確認中…"],
  ["Version", "Version", "Versión", "Version", "Versione", "Versão", "الإصدار", "バージョン"],
  ["Delete avatar?", "Supprimer l'avatar ?", "¿Eliminar avatar?", "Avatar löschen?", "Eliminare l'avatar?", "Excluir o avatar?", "حذف الصورة الرمزية؟", "アバターを削除しますか？"],
  ["Your face shape, outfit and voice go back to the defaults. This can't be undone.", "Ton visage, ta tenue et ta voix reviennent aux valeurs par défaut. Action irréversible.", "Tu rostro, ropa y voz vuelven a los valores predeterminados. No se puede deshacer.", "Gesicht, Outfit und Stimme werden auf die Standardwerte zurückgesetzt. Das kann nicht rückgängig gemacht werden.", "Viso, outfit e voce tornano ai valori predefiniti. Non si può annullare.", "Rosto, roupa e voz voltam ao padrão. Isso não pode ser desfeito.", "يعود شكل الوجه والملابس والصوت إلى الوضع الافتراضي. لا يمكن التراجع.", "顔・服装・声が初期設定に戻ります。元に戻せません。"],
  ["Cancel", "Annuler", "Cancelar", "Abbrechen", "Annulla", "Cancelar", "إلغاء", "キャンセル"],
  ["Preparing…", "Préparation…", "Preparando…", "Wird vorbereitet…", "Preparazione…", "A preparar…", "جارٍ التحضير…", "準備中…"],
  ["Saved ✓", "Enregistré ✓", "Guardado ✓", "Gespeichert ✓", "Salvato ✓", "Salvo ✓", "تم الحفظ ✓", "保存済み ✓"],
  ["Failed — is the backend running?", "Échec — le backend est-il lancé ?", "Error: ¿está el backend en marcha?", "Fehlgeschlagen — läuft das Backend?", "Errore — il backend è attivo?", "Falhou — o backend está a correr?", "فشل — هل الخادم يعمل؟", "失敗 — バックエンドは起動していますか？"],
  // avatar canvas
  ["Waking your avatar…", "Réveil de ton avatar…", "Despertando tu avatar…", "Dein Avatar erwacht…", "Il tuo avatar si sta svegliando…", "Acordando seu avatar…", "جارٍ إيقاظ صورتك الرمزية…", "アバターを起こしています…"],
  ["Start the backend on :8100 to bring your avatar to life", "Lance le backend sur :8100 pour donner vie à ton avatar", "Inicia el backend en :8100 para dar vida a tu avatar", "Starte das Backend auf :8100, um deinen Avatar zum Leben zu erwecken", "Avvia il backend su :8100 per dare vita al tuo avatar", "Inicie o backend na porta :8100 para dar vida ao seu avatar", "شغّل الخادم على ‎:8100 لإحياء صورتك الرمزية", "バックエンド(:8100)を起動するとアバターが動き出します"],
  // mic errors (useAura)
  ["Hold the mic and speak — that was too short.", "Maintiens le micro et parle — c'était trop court.", "Mantén el micro y habla: fue demasiado corto.", "Halte das Mikro und sprich — das war zu kurz.", "Tieni premuto il micro e parla — troppo breve.", "Segure o micro e fale — foi curto demais.", "اضغط على الميكروفون وتحدث — كان ذلك قصيراً جداً.", "マイクを押しながら話してください — 短すぎました。"],
  ["Mic captured only silence — check the input device in your browser/OS sound settings.", "Le micro n'a capté que du silence — vérifie le périphérique d'entrée dans les réglages du navigateur/système.", "El micro solo captó silencio: revisa el dispositivo de entrada en los ajustes del navegador/sistema.", "Das Mikro hat nur Stille aufgenommen — prüfe das Eingabegerät in den Browser-/Systemeinstellungen.", "Il micro ha registrato solo silenzio — controlla il dispositivo di ingresso nelle impostazioni.", "O micro captou apenas silêncio — verifique o dispositivo de entrada nas definições.", "التقط الميكروفون صمتاً فقط — تحقق من جهاز الإدخال في إعدادات المتصفح/النظام.", "マイクは無音でした — ブラウザ/OSの入力デバイス設定を確認してください。"],
  // animations test bench (short labels only; clip ids stay as-is)
  ["Test Animations", "Tester les animations", "Probar animaciones", "Animationen testen", "Prova animazioni", "Testar animações", "تجربة الحركات", "アニメーションテスト"],
  ["Send", "Envoyer", "Enviar", "Senden", "Invia", "Enviar", "إرسال", "送信"],
  ["Stop", "Stop", "Detener", "Stopp", "Stop", "Parar", "إيقاف", "停止"],
  ["Loop", "Boucle", "Bucle", "Schleife", "Loop", "Loop", "تكرار", "ループ"],
];

const LANG_COL: Record<string, number> = {
  English: 0, "Français": 1, "Español": 2, Deutsch: 3, Italiano: 4,
  "Português": 5, "العربية": 6, "日本語": 7,
};

// language -> { english string -> translated string }; built once
const MAPS: Record<string, Record<string, string>> = {};
for (const [lang, col] of Object.entries(LANG_COL)) {
  if (col === 0) continue;
  const m: Record<string, string> = {};
  for (const row of ROWS) m[row[0]] = row[col];
  MAPS[lang] = m;
}

export const isRTL = (language: string) => language === "العربية";

const tFor = (language: string) => {
  const m = MAPS[language];
  return (s: string) => m?.[s] ?? s;
};

/** Reactive translator — re-renders the component when the language changes. */
export function useT() {
  const { language } = useSettings();
  return useMemo(() => tFor(language), [language]);
}

/** Non-reactive translator for callbacks/errors outside render. */
export const t = (s: string) => tFor(getSettings().language)(s);
