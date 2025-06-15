
import React, { useState, useEffect, useCallback } from 'react';
import { Category, TextVariant, SeoVariant, ImageVariant } from './types';
import { UI_TEXTS, DEFAULT_SYSTEM_PROMPT } from './constants';
import * as GeminiService from './services/GeminiService';

import BlockWrapper from './components/BlockWrapper';
import Chip from './components/Chip';
import IconButton from './components/IconButton';
import VariantSelector from './components/VariantSelector';
import Modal from './components/Modal';

import SparklesIcon from './components/icons/SparklesIcon';
import RefreshIcon from './components/icons/RefreshIcon';
import SettingsIcon from './components/icons/SettingsIcon';

const App: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [articleTopic, setArticleTopic] = useState<string>('');
  
  const [articleContentVariants, setArticleContentVariants] = useState<TextVariant[]>([]);
  const [selectedArticleContentId, setSelectedArticleContentId] = useState<string | null>(null);
  const [finalArticleContent, setFinalArticleContent] = useState<string>(''); // Will store HTML
  const [articleContentVariantsLoading, setArticleContentVariantsLoading] = useState<boolean>(false);
  const [articleContentVariantsError, setArticleContentVariantsError] = useState<string | null>(null);

  const [leadTitles, setLeadTitles] = useState<TextVariant[]>([]);
  const [selectedLeadTitleId, setSelectedLeadTitleId] = useState<string | null>(null);
  const [leadTitleLoading, setLeadTitleLoading] = useState<boolean>(false);
  const [leadTitleError, setLeadTitleError] = useState<string | null>(null);

  const [articleTitles, setArticleTitles] = useState<TextVariant[]>([]);
  const [selectedArticleTitleId, setSelectedArticleTitleId] = useState<string | null>(null);
  const [articleTitleLoading, setArticleTitleLoading] = useState<boolean>(false);
  const [articleTitleError, setArticleTitleError] = useState<string | null>(null);
  
  const [seoVariants, setSeoVariants] = useState<SeoVariant[]>([]);
  const [selectedSeoVariantId, setSelectedSeoVariantId] = useState<string | null>(null);
  const [seoLoading, setSeoLoading] = useState<boolean>(false);
  const [seoError, setSeoError] = useState<string | null>(null);

  const [imageVariants, setImageVariants] = useState<ImageVariant[]>([]);
  const [selectedImageVariantId, setSelectedImageVariantId] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState<boolean>(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [systemPrompt, setSystemPrompt] = useState<string>(DEFAULT_SYSTEM_PROMPT);
  const [tempSystemPrompt, setTempSystemPrompt] = useState<string>(systemPrompt);

  const apiKeyExists = !!process.env.API_KEY;

  const handleGenerate = async <T, U extends { id: string }>(
    baseActionDescription: string,
    generatorFn: (prompt: string, count?: number, sysPrompt?: string) => Promise<T[]>,
    setter: React.Dispatch<React.SetStateAction<U[]>>,
    setLoading: React.Dispatch<React.SetStateAction<boolean>>,
    setError: React.Dispatch<React.SetStateAction<string | null>>,
    count: number = 3,
    transformFn: (item: T, index: number) => U,
    isReimagine: boolean = false,
    onGenerationStart?: () => void
  ) => {
    if (!apiKeyExists) { setError(UI_TEXTS.noApiKey); return; }
    if (!articleTopic.trim()) { 
         setError("Пожалуйста, введите тему статьи."); return; 
    }
    
    setLoading(true);
    setError(null);
    if (onGenerationStart) {
      onGenerationStart();
    }

    let prompt = `Тема: "${articleTopic}". Категория: ${selectedCategory || 'общая'}. Действие: ${baseActionDescription}.`;
    if (isReimagine) {
      prompt += " Требуются новые варианты, отличающиеся от предыдущих.";
    }

    try {
      const results = await generatorFn(prompt, count, systemPrompt);
      setter(results.map(transformFn));
    } catch (err) {
      console.error(err);
      setError(UI_TEXTS.errorOccurred);
      setter([]);
    } finally {
      setLoading(false);
    }
  };
  
  const generateInitialArticleVariants = async () => {
    handleGenerate(
      "Сгенерировать 2 полноценных и развёрнутых варианта основного текста для статьи в формате HTML (включая параграфы, заголовки h2/h3, и списки ul/ol/li по необходимости)",
      GeminiService.generateMultipleHtmlSnippets, // Use new HTML snippet generator
      setArticleContentVariants,
      setArticleContentVariantsLoading,
      setArticleContentVariantsError,
      2,
      genericTextTransformer, // TextVariant still fits, 'text' field will hold HTML string
      false,
      () => { 
        setSelectedArticleContentId(null);
        setFinalArticleContent('');
      }
    );
  };
  
  const genericTextTransformer = (text: string, index: number): TextVariant => ({ id: `v${index}-${Date.now()}`, text });
  const seoTransformer = (item: { title: string, description: string }, index: number): SeoVariant => ({ id: `seo${index}-${Date.now()}`, ...item });
  const imageTransformer = (imageUrl: string, index: number): ImageVariant => ({ id: `img${index}-${Date.now()}`, imageUrl });

  const handleSaveSystemPrompt = () => {
    setSystemPrompt(tempSystemPrompt);
    setIsSettingsModalOpen(false);
  };
  
  const categoryMap: { [key in Category]: string } = {
    [Category.Diets]: UI_TEXTS.diets,
    [Category.Products]: UI_TEXTS.products,
    [Category.Recipes]: UI_TEXTS.recipes,
    [Category.Horoscopes]: UI_TEXTS.horoscopes,
    [Category.Lifestyle]: UI_TEXTS.lifestyle,
  };

  const isSubmitDisabled = () => {
    if (!articleTopic.trim() || !selectedArticleContentId) return true;
    if (!selectedLeadTitleId || !selectedArticleTitleId || !selectedSeoVariantId || !selectedImageVariantId) return true;
    return false;
  };

  const handleExportToJson = () => {
    if (isSubmitDisabled()) {
      alert("Пожалуйста, сгенерируйте и выберите все необходимые элементы статьи перед экспортом.");
      return;
    }

    const selectedLead = leadTitles.find(lt => lt.id === selectedLeadTitleId);
    const selectedTitle = articleTitles.find(at => at.id === selectedArticleTitleId);
    const selectedSeo = seoVariants.find(sv => sv.id === selectedSeoVariantId);
    const selectedImage = imageVariants.find(iv => iv.id === selectedImageVariantId);

    const exportData = {
      category: selectedCategory,
      topic: articleTopic,
      articleHtmlContent: finalArticleContent,
      leadParagraph: selectedLead ? selectedLead.text : null,
      articleTitle: selectedTitle ? selectedTitle.text : null,
      seo: selectedSeo ? { title: selectedSeo.title, description: selectedSeo.description } : null,
      imageUrl: selectedImage ? selectedImage.imageUrl : null,
      generatedAt: new Date().toISOString(),
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeTopicName = articleTopic.replace(/[^a-z0-9]/gi, '_').toLowerCase() || "export";
    a.download = `chiia_article_${safeTopicName}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };


  return (
    <div className="container mx-auto max-w-3xl p-0 sm:p-4 my-5 font-sans">
      <button 
        onClick={() => setIsSettingsModalOpen(true)} 
        className="fixed top-5 right-5 z-20 bg-card-bg p-2.5 shadow-card rounded-none border border-border-color hover:bg-gray-100"
        aria-label={UI_TEXTS.settings}
        title={UI_TEXTS.settings}
      >
        <SettingsIcon className="w-5 h-5 text-text-color" />
      </button>

      <header className="py-4 mb-2 px-1 sm:px-0">
        <h1 className="text-3xl font-semibold text-text-color">
          {UI_TEXTS.appName}
        </h1>
      </header>

      {!apiKeyExists && (
        <div className="p-3 mb-4 text-sm text-yellow-800 bg-yellow-100 rounded-none border border-yellow-300" role="alert">
          <span className="font-semibold">Внимание!</span> {UI_TEXTS.noApiKey} Некоторые функции могут быть недоступны.
        </div>
      )}

      <div className="flex flex-col gap-5">
        <BlockWrapper title={UI_TEXTS.categorySelection} tooltipText={UI_TEXTS.tooltipCategory}>
          <div className="flex flex-wrap gap-2">
            {Object.values(Category).map((cat) => (
              <Chip
                key={cat}
                label={categoryMap[cat]}
                isActive={selectedCategory === cat}
                onClick={() => setSelectedCategory(cat)}
              />
            ))}
          </div>
        </BlockWrapper>

        <BlockWrapper title={UI_TEXTS.articleTopic} tooltipText={UI_TEXTS.tooltipTopic}>
          <input
            type="text"
            value={articleTopic}
            onChange={(e) => setArticleTopic(e.target.value)}
            placeholder={UI_TEXTS.articleTopicPlaceholder}
            className="w-full p-2.5 bg-input-bg border border-input-border rounded-none focus:ring-1 focus:ring-black focus:border-black outline-none transition-shadow text-text-color placeholder-placeholder-text"
          />
          <IconButton 
            onClick={generateInitialArticleVariants}
            isLoading={articleContentVariantsLoading} // Only main article content loading
            disabled={!articleTopic.trim() || !apiKeyExists || articleContentVariantsLoading}
            className="w-full mt-3"
          >
            {UI_TEXTS.generateArticle}
          </IconButton>
        </BlockWrapper>
        
        <BlockWrapper title={UI_TEXTS.textEditor} tooltipText={UI_TEXTS.tooltipEditor}>
           <div className="mb-3 flex space-x-2">
            <IconButton 
              onClick={() => handleGenerate(
                "Сгенерировать 2 полноценных и развёрнутых варианта основного текста для статьи в формате HTML (включая параграфы, заголовки h2/h3, и списки ul/ol/li по необходимости)",
                GeminiService.generateMultipleHtmlSnippets,
                setArticleContentVariants, setArticleContentVariantsLoading, setArticleContentVariantsError,
                2, genericTextTransformer, false,
                () => { setSelectedArticleContentId(null); setFinalArticleContent(''); }
              )}
              isLoading={articleContentVariantsLoading} 
              disabled={!articleTopic.trim() || !apiKeyExists}
            >
              <SparklesIcon className="w-4 h-4 mr-1.5" /> {UI_TEXTS.generate}
            </IconButton>
            <IconButton 
              onClick={() => handleGenerate(
                "Сгенерировать 2 полноценных и развёрнутых варианта основного текста для статьи в формате HTML (включая параграфы, заголовки h2/h3, и списки ul/ol/li по необходимости)",
                GeminiService.generateMultipleHtmlSnippets,
                setArticleContentVariants, setArticleContentVariantsLoading, setArticleContentVariantsError,
                2, genericTextTransformer, true,
                () => { setSelectedArticleContentId(null); setFinalArticleContent(''); }
              )}
              isLoading={articleContentVariantsLoading} 
              disabled={!articleTopic.trim() || articleContentVariants.length === 0 || !apiKeyExists} 
            >
              <RefreshIcon className="w-4 h-4 mr-1.5" /> {UI_TEXTS.reimagine}
            </IconButton>
          </div>
          <VariantSelector
            variants={articleContentVariants}
            selectedVariantId={selectedArticleContentId}
            onSelectVariant={(id) => {
              setSelectedArticleContentId(id);
              const selectedVar = articleContentVariants.find(v => v.id === id);
              setFinalArticleContent(selectedVar ? selectedVar.text : '');
            }}
            loading={articleContentVariantsLoading}
            error={articleContentVariantsError}
            renderVariant={(variant, _) => (
              <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: variant.text }} />
            )}
          />
        </BlockWrapper>

        <BlockWrapper title={UI_TEXTS.leadTitle} tooltipText={UI_TEXTS.tooltipLeadTitle}>
          <div className="mb-3 flex space-x-2">
            <IconButton 
              onClick={() => handleGenerate(
                "Сгенерировать 3 варианта лид-заголовка (вступления), каждый объемом не менее двух-трех развернутых предложений.", 
                GeminiService.generateMultipleTextVariants, 
                setLeadTitles, setLeadTitleLoading, setLeadTitleError, 
                3, genericTextTransformer, false,
                () => setSelectedLeadTitleId(null)
              )}
              isLoading={leadTitleLoading} disabled={!articleTopic.trim() || !apiKeyExists}>
              <SparklesIcon className="w-4 h-4 mr-1.5" /> {UI_TEXTS.generate}
            </IconButton>
            <IconButton
              onClick={() => handleGenerate(
                "Сгенерировать 3 варианта лид-заголовка (вступления), каждый объемом не менее двух-трех развернутых предложений.", 
                GeminiService.generateMultipleTextVariants, 
                setLeadTitles, setLeadTitleLoading, setLeadTitleError, 
                3, genericTextTransformer, true,
                () => setSelectedLeadTitleId(null)
              )}
              isLoading={leadTitleLoading} disabled={!articleTopic.trim() || leadTitles.length === 0 || !apiKeyExists} >
              <RefreshIcon className="w-4 h-4 mr-1.5" /> {UI_TEXTS.reimagine}
            </IconButton>
          </div>
          <VariantSelector
            variants={leadTitles}
            selectedVariantId={selectedLeadTitleId}
            onSelectVariant={setSelectedLeadTitleId}
            loading={leadTitleLoading}
            error={leadTitleError}
            renderVariant={(variant, _) => <p className="whitespace-pre-wrap">{variant.text}</p>}
          />
        </BlockWrapper>

        <BlockWrapper title={UI_TEXTS.articleTitle} tooltipText={UI_TEXTS.tooltipArticleTitle}>
           <div className="mb-3 flex space-x-2">
            <IconButton
              onClick={() => handleGenerate(
                "Сгенерировать 3 варианта заголовка статьи", 
                GeminiService.generateMultipleTextVariants, 
                setArticleTitles, setArticleTitleLoading, setArticleTitleError, 
                3, genericTextTransformer, false,
                () => setSelectedArticleTitleId(null)
              )}
              isLoading={articleTitleLoading} disabled={!articleTopic.trim() || !apiKeyExists}>
              <SparklesIcon className="w-4 h-4 mr-1.5" /> {UI_TEXTS.generate}
            </IconButton>
            <IconButton
              onClick={() => handleGenerate(
                "Сгенерировать 3 варианта заголовка статьи", 
                GeminiService.generateMultipleTextVariants, 
                setArticleTitles, setArticleTitleLoading, setArticleTitleError, 
                3, genericTextTransformer, true,
                () => setSelectedArticleTitleId(null)
              )}
              isLoading={articleTitleLoading} disabled={!articleTopic.trim() || articleTitles.length === 0 || !apiKeyExists} >
              <RefreshIcon className="w-4 h-4 mr-1.5" /> {UI_TEXTS.reimagine}
            </IconButton>
          </div>
          <VariantSelector
            variants={articleTitles}
            selectedVariantId={selectedArticleTitleId}
            onSelectVariant={setSelectedArticleTitleId}
            loading={articleTitleLoading}
            error={articleTitleError}
            renderVariant={(variant, _) => <p>{variant.text}</p>}
          />
        </BlockWrapper>

        <BlockWrapper title={UI_TEXTS.seoBlock} tooltipText={UI_TEXTS.tooltipSEO}>
           <div className="mb-3 flex space-x-2">
            <IconButton
              onClick={() => handleGenerate(
                `SEO-заголовки (title) и SEO-описания (description) для статьи`, 
                (prompt, count, sysPrompt) => GeminiService.generateSeoDataVariants(articleTopic, count, sysPrompt),
                setSeoVariants, setSeoLoading, setSeoError, 
                3, seoTransformer, false,
                () => setSelectedSeoVariantId(null)
              )}
              isLoading={seoLoading} disabled={!articleTopic.trim() || !apiKeyExists}>
              <SparklesIcon className="w-4 h-4 mr-1.5" /> {UI_TEXTS.generate}
            </IconButton>
            <IconButton
              onClick={() => handleGenerate(
                `SEO-заголовки (title) и SEO-описания (description) для статьи`, 
                (prompt, count, sysPrompt) => GeminiService.generateSeoDataVariants(articleTopic, count, sysPrompt),
                setSeoVariants, setSeoLoading, setSeoError, 
                3, seoTransformer, true,
                () => setSelectedSeoVariantId(null)
              )} 
              isLoading={seoLoading} disabled={!articleTopic.trim() || seoVariants.length === 0 || !apiKeyExists} >
              <RefreshIcon className="w-4 h-4 mr-1.5" /> {UI_TEXTS.reimagine}
            </IconButton>
          </div>
          <VariantSelector
            variants={seoVariants}
            selectedVariantId={selectedSeoVariantId}
            onSelectVariant={setSelectedSeoVariantId}
            loading={seoLoading}
            error={seoError}
            renderVariant={(variant, _) => (
              <div>
                <p className="font-semibold">{variant.title}</p>
                <p className="text-xs text-gray-600 mt-0.5">{variant.description}</p>
              </div>
            )}
          />
        </BlockWrapper>

        <BlockWrapper title={UI_TEXTS.imageGeneration} tooltipText={UI_TEXTS.tooltipImage}>
          <div className="mb-3 flex space-x-2">
            <IconButton
              onClick={() => handleGenerate(
                "Создать изображение для статьи", 
                GeminiService.generateMultipleImageVariants, 
                setImageVariants, setImageLoading, setImageError, 
                3, imageTransformer, false,
                () => setSelectedImageVariantId(null)
              )}
              isLoading={imageLoading} disabled={!articleTopic.trim() || !apiKeyExists}>
              <SparklesIcon className="w-4 h-4 mr-1.5" /> {UI_TEXTS.generate}
            </IconButton>
            <IconButton
              onClick={() => handleGenerate(
                "Создать другое изображение для статьи", 
                GeminiService.generateMultipleImageVariants, 
                setImageVariants, setImageLoading, setImageError, 
                3, imageTransformer, true,
                () => setSelectedImageVariantId(null)
              )}
              isLoading={imageLoading} disabled={!articleTopic.trim() || imageVariants.length === 0 || !apiKeyExists} >
              <RefreshIcon className="w-4 h-4 mr-1.5" /> {UI_TEXTS.reimagine}
            </IconButton>
          </div>
           {imageVariants.length === 0 && !imageLoading && !imageError && (
             <div className="h-48 flex items-center justify-center bg-card-bg border border-dashed border-border-color rounded-none text-text-color">
                Изображения еще не сгенерированы.
             </div>
           )}
          <VariantSelector
            variants={imageVariants}
            selectedVariantId={selectedImageVariantId}
            onSelectVariant={setSelectedImageVariantId}
            loading={imageLoading}
            error={imageError}
            renderVariant={(variant, isSelected) => (
              <img 
                src={variant.imageUrl} 
                alt="Сгенерированное изображение" 
                className={`w-full rounded-none object-cover ${isSelected ? 'ring-2 ring-black ring-offset-2 ring-offset-card-bg' : ''}`}
                style={{ aspectRatio: '2 / 1' }} 
              />
            )}
          />
        </BlockWrapper>
      </div>

      <div className="mt-6">
        <IconButton 
            className="w-full py-2.5" 
            onClick={handleExportToJson}
            disabled={isSubmitDisabled()}
        >
          {UI_TEXTS.exportToJson}
        </IconButton>
      </div>

      <Modal
        isOpen={isSettingsModalOpen}
        onClose={() => {
          setIsSettingsModalOpen(false);
          setTempSystemPrompt(systemPrompt);
        }}
        title={UI_TEXTS.settings}
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="systemPrompt" className="block text-sm font-medium text-text-color mb-1">
              {UI_TEXTS.systemPrompt}
            </label>
            <textarea
              id="systemPrompt"
              rows={5}
              value={tempSystemPrompt}
              onChange={(e) => setTempSystemPrompt(e.target.value)}
              placeholder={UI_TEXTS.systemPromptPlaceholder}
              className="w-full p-2.5 bg-input-bg border border-input-border rounded-none focus:ring-1 focus:ring-black focus:border-black outline-none transition-shadow text-text-color placeholder-placeholder-text"
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => {
                setIsSettingsModalOpen(false);
                setTempSystemPrompt(systemPrompt);
              }}
              className="px-4 py-2 text-sm font-medium text-text-color bg-gray-100 hover:bg-gray-200 rounded-none border border-border-color transition-colors"
            >
              {UI_TEXTS.cancel}
            </button>
            <IconButton onClick={handleSaveSystemPrompt}>
              {UI_TEXTS.save}
            </IconButton>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default App;
