let dictionary = {
    pinyin: {},
    english: {}
};

const DICTIONARY_URL = 'https://chinese-test-test.oss-ap-southeast-6.aliyuncs.com/cedict_1_0_ts_utf-8_mdbg.txt';

const translations = {
    en: {
        pinyinToEnglish: "Pinyin to English",
        englishToChinese: "English to Chinese and Pinyin",
        inputPlaceholder: "Enter Pinyin or English...",
        translate: "Translate"
    },
    zh: {
        pinyinToEnglish: "拼音到英文",
        englishToChinese: "英文到中文和拼音",
        inputPlaceholder: "输入拼音或英文...",
        translate: "翻译"
    }
};

let currentLang = 'en';

function loadDictionary() {
    console.log('开始加载字典...', DICTIONARY_URL);
    fetch(DICTIONARY_URL)
        .then(response => {
            console.log('收到响应:', response.status, response.statusText);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
        })
        .then(text => {
            console.log('字典文本长度:', text.length);
            if (text.length === 0) {
                throw new Error('字典内容为空');
            }
            parseDictionary(text);
            console.log('字典加载完成，拼音条目数:', Object.keys(dictionary.pinyin).length);
            console.log('字典加载完成，英文条目数:', Object.keys(dictionary.english).length);
        })
        .catch(error => {
            console.error('加载字典出错:', error);
            document.getElementById('output').textContent = '加载字典失败，请检查控制台错误信息并刷新页面重试。';
        });
}

function parseDictionary(text) {
    const lines = text.split('\n');

    lines.forEach(line => {
        if (line.startsWith('#')) return; // 跳过注释行
        const match = line.match(/^(\S+)\s(\S+)\s\[([^\]]+)\]\s\/(.+)\//);
        if (match) {
            const [, traditional, simplified, pinyin, english] = match;
            const pinyinClean = pinyin.toLowerCase().replace(/\s/g, '').replace(/\d/g, ''); // 移除空格和声调数字
            const pinyinWithTone = convertToneNumbers(pinyin.replace(/\s/g, '')); // 移除空格并转换声调
            const englishDefinitions = english.split('/').filter(def => def.trim() !== '');

            // 添加拼音到英文的映射（包括带声调和不带声调的版本）
            [pinyinClean, pinyinWithTone].forEach(pinyinVersion => {
                if (!dictionary.pinyin[pinyinVersion]) {
                    dictionary.pinyin[pinyinVersion] = [];
                }
                dictionary.pinyin[pinyinVersion].push({
                    simplified,
                    traditional,
                    pinyin: pinyinWithTone,
                    definitions: englishDefinitions
                });
            });

            // 添加英文到中文和拼音的映射
            englishDefinitions.forEach(def => {
                const lowerDef = def.toLowerCase().trim();
                if (!dictionary.english[lowerDef]) {
                    dictionary.english[lowerDef] = [];
                }
                dictionary.english[lowerDef].push({
                    simplified,
                    traditional,
                    pinyin: pinyinWithTone
                });
            });
        }
    });
}

function convertToneNumbers(pinyin) {
    const toneMarks = {
        'a': ['ā', 'á', 'ǎ', 'à', 'a'],
        'e': ['ē', 'é', 'ě', 'è', 'e'],
        'i': ['ī', 'í', 'ǐ', 'ì', 'i'],
        'o': ['ō', 'ó', 'ǒ', 'ò', 'o'],
        'u': ['ū', 'ú', 'ǔ', 'ù', 'u'],
        'ü': ['ǖ', 'ǘ', 'ǚ', 'ǜ', 'ü']
    };

    return pinyin.replace(/([aeiouü])(n?g?)(\d)/gi, (match, vowel, ending, tone) => {
        const index = parseInt(tone) - 1;
        const newVowel = toneMarks[vowel.toLowerCase()][index];
        return (vowel === vowel.toUpperCase() ? newVowel.toUpperCase() : newVowel) + ending;
    });
}

function translate() {
    const input = document.getElementById('input').value.trim();
    const output = document.getElementById('output');
    const mode = document.querySelector('input[name="mode"]:checked').value;

    let translated;
    if (mode === 'pinyinToEnglish') {
        translated = translatePinyinToEnglish(input);
    } else {
        translated = translateEnglishToChinese(input);
    }

    output.innerHTML = translated;
    console.log('翻译完成:', translated);
}

function translatePinyinToEnglish(input) {
    const words = input.toLowerCase().split(/\s+/);
    const results = [];

    // 尝试翻译整个短语
    const phraseResult = translatePhrase(words.join(''));
    if (phraseResult) {
        results.push(phraseResult);
    }

    // 如果整个短语没有匹配，尝试翻译单个词
    if (results.length === 0) {
        for (let i = 0; i < words.length; i++) {
            // 尝试翻译两个词的组合
            if (i < words.length - 1) {
                const twoWordPhrase = words[i] + words[i+1];
                const twoWordResult = translatePhrase(twoWordPhrase);
                if (twoWordResult) {
                    results.push(twoWordResult);
                    i++; // 跳过下一个词，因为已经作为词组的一部分翻译了
                    continue;
                }
            }
            
            // 翻译单个词
            const word = words[i];
            const entries = dictionary.pinyin[word] || dictionary.pinyin[word.replace(/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/g, match => {
                return 'aeiouü'['āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ'.indexOf(match) % 5];
            })];
            if (entries) {
                results.push(entries.map(entry => 
                    `${entry.simplified} (${entry.pinyin}): ${entry.definitions.join(', ')}`
                ).join('<br>'));
            } else {
                results.push(word);
            }
        }
    }

    return results.join('<br><br>');
}

function translatePhrase(phrase) {
    const entry = dictionary.pinyin[phrase];
    if (entry) {
        return entry.map(e => `${e.simplified} (${e.pinyin}): ${e.definitions.join(', ')}`).join('<br>');
    }
    return null;
}

function translatePhrase(phrase) {
    const entry = dictionary.pinyin[phrase];
    if (entry) {
        return entry.map(e => `${e.simplified} (${e.pinyin}): ${e.definitions.join(', ')}`).join('<br>');
    }
    return null;
}

function translateEnglishToChinese(input) {
    const words = input.toLowerCase().split(/\s+/);
    return words.map(word => {
        const entries = dictionary.english[word];
        if (entries) {
            return entries.map(entry => 
                `${entry.simplified} ${entry.pinyin}`
            ).join('<br>');
        }
        return word;
    }).join('<br><br>');
}

function updateLanguage(lang) {
    currentLang = lang;
    document.querySelectorAll('[data-lang-key]').forEach(el => {
        const key = el.getAttribute('data-lang-key');
        if (el.placeholder) {
            el.placeholder = translations[currentLang][key];
        } else {
            el.textContent = translations[currentLang][key];
        }
    });
    document.documentElement.lang = currentLang;
    document.getElementById('languageDropdown').firstChild.textContent = lang === 'en' ? 'English' : '中文';
}

function setupEventListeners() {
    document.getElementById('languageDropdown').addEventListener('click', function() {
        document.getElementById('languageMenu').classList.toggle('hidden');
    });

    document.querySelectorAll('#languageMenu a').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            updateLanguage(this.getAttribute('data-lang'));
            document.getElementById('languageMenu').classList.add('hidden');
        });
    });

    document.addEventListener('click', function(event) {
        if (!event.target.closest('#languageDropdown') && !event.target.closest('#languageMenu')) {
            document.getElementById('languageMenu').classList.add('hidden');
        }
    });

    const translateButton = document.getElementById('translateBtn');
    if (translateButton) {
        translateButton.addEventListener('click', translate);
    } else {
        console.error('未找到翻译按钮');
    }
}

// 初始化函数
function init() {
    loadDictionary();
    setupEventListeners();
    updateLanguage('en');
}

// 当 DOM 加载完成后执行初始化
document.addEventListener('DOMContentLoaded', init);   