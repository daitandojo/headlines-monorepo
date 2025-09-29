// apps/admin/src/app/(protected)/scraper-ide/_components/ScraperIde.jsx (NEW FILE)
'use client'

import { useState, useReducer, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { produce } from 'immer'

import { createSource, updateSource } from '@/lib/api-client'
import {
  fullSourceAnalysis,
  analyzeSourceForSelectors,
  testRecipe,
} from '@/lib/api-client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@components/shared'
import SourceDefinitionPanel from './SourceDefinitionPanel'
import AnalysisPanel from './AnalysisPanel'
import ArticleExtractorView from './ArticleExtractorView'
import ConfirmationModal from './ConfirmationModal'
import TabsBar from './TabsBar'

const ideReducer = (state, action) =>
  produce(state, (draft) => {
    switch (action.type) {
      case 'SET_SOURCE_DATA':
        draft.sourceData = { ...draft.sourceData, ...action.payload }
        draft.isDirty = true
        break
      case 'REPLACE_SOURCE_DATA':
        draft.sourceData = action.payload
        draft.isDirty = false
        break
      case 'SET_LOADING':
        draft.loadingStates[action.payload.key] = action.payload.value
        break
      case 'ADD_TAB':
        if (!draft.tabs.some((t) => t.url === action.payload.url)) {
          draft.tabs.push(action.payload)
        }
        draft.activeTabId = action.payload.id
        break
      case 'CLOSE_TAB':
        const tabIndex = draft.tabs.findIndex((t) => t.id === action.payload)
        if (tabIndex > -1) {
          draft.tabs.splice(tabIndex, 1)
          if (draft.activeTabId === action.payload) {
            draft.activeTabId = draft.tabs[tabIndex - 1]?.id || draft.tabs[0]?.id || null
          }
        }
        break
      case 'SET_ACTIVE_TAB':
        draft.activeTabId = action.payload
        break
      case 'SET_ANALYSIS_DATA':
        draft.analysisData[action.payload.tabId] = action.payload.data
        break
      case 'SET_HTML_DATA':
        draft.htmlData[action.payload.tabId] = action.payload.data
        break
      case 'SET_MODAL':
        draft.modalState.key = action.payload.key
        draft.modalState.data = action.payload.data
        break
      case 'RESET_DIRTY':
        draft.isDirty = false
        break
      default:
        break
    }
  })

export function ScraperIde({
  sourceData: initialSourceData,
  onSave,
  onTest,
  allCountries,
}) {
  const [state, dispatch] = useReducer(ideReducer, {
    sourceData: initialSourceData,
    isDirty: false,
    loadingStates: { isSaving: false, isTesting: false, isAnalyzing: false },
    tabs: [],
    activeTabId: null,
    analysisData: {},
    htmlData: {},
    modalState: { key: null, data: null },
  })

  useEffect(() => {
    dispatch({ type: 'REPLACE_SOURCE_DATA', payload: initialSourceData })
    if (initialSourceData.sectionUrl) {
      handleOpenTab(initialSourceData.sectionUrl, 'discovery')
    }
  }, [initialSourceData])

  const handleDataChange = useCallback((payload) => {
    dispatch({ type: 'SET_SOURCE_DATA', payload })
  }, [])

  const handleOpenTab = (url, type) => {
    if (!url) return
    const id = btoa(url) // Simple unique ID from URL
    dispatch({ type: 'ADD_TAB', payload: { id, url, type } })
  }

  const activeTab = useMemo(
    () => state.tabs.find((t) => t.id === state.activeTabId),
    [state.tabs, state.activeTabId]
  )

  const handleAnalyzeUrl = useCallback(
    async (url) => {
      if (!url || state.loadingStates.isAnalyzing) return
      dispatch({ type: 'SET_LOADING', payload: { key: 'isAnalyzing', value: true } })
      const toastId = toast.loading(`Analyzing ${url}...`)
      const result = await analyzeSourceForSelectors(url)
      dispatch({ type: 'SET_LOADING', payload: { key: 'isAnalyzing', value: false } })
      if (result.success) {
        toast.success('Analysis complete.', { id: toastId })
        dispatch({
          type: 'SET_ANALYSIS_DATA',
          payload: { tabId: activeTab.id, data: result },
        })
        dispatch({ type: 'SET_HTML_DATA', payload: { tabId: activeTab.id, data: null } }) // Clear HTML view if analysis is run
      } else {
        toast.error('Analysis failed.', { id: toastId, description: result.error })
      }
    },
    [activeTab?.id, state.loadingStates.isAnalyzing]
  )

  const handleSetSelector = (selectors, key = 'headlineSelector') => {
    const payload = Array.isArray(selectors)
      ? selectors
      : selectors
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
    handleDataChange({ [key]: payload })
  }

  const handleDrillDown = async (url) => {
    handleOpenTab(url, 'article')
    dispatch({ type: 'SET_LOADING', payload: { key: 'isAnalyzing', value: true } })
    const result = await testRecipe(state.sourceData, url) // Using testRecipe to fetch HTML
    dispatch({ type: 'SET_LOADING', payload: { key: 'isAnalyzing', value: false } })
    if (result.success) {
      const tabId = btoa(url)
      dispatch({
        type: 'SET_HTML_DATA',
        payload: { tabId, data: result.content.preview },
      })
    }
  }

  const handleSave = async () => {
    dispatch({ type: 'SET_LOADING', payload: { key: 'isSaving', value: true } })
    const isNew = !state.sourceData._id
    const result = isNew
      ? await createSource(state.sourceData)
      : await updateSource(state.sourceData._id, state.sourceData)
    if (result.source) {
      toast.success(`Source ${isNew ? 'created' : 'updated'}.`)
      onSave(result.source)
      dispatch({ type: 'RESET_DIRTY' })
    } else {
      toast.error('Save failed', { description: result.error })
    }
    dispatch({ type: 'SET_LOADING', payload: { key: 'isSaving', value: false } })
    dispatch({ type: 'SET_MODAL', payload: { key: null, data: null } })
  }

  const handleTest = async () => {
    dispatch({ type: 'SET_LOADING', payload: { key: 'isTesting', value: true } })
    const testResults = await onTest(state.sourceData)
    dispatch({ type: 'SET_LOADING', payload: { key: 'isTesting', value: false } })
    if (testResults) {
      dispatch({ type: 'SET_MODAL', payload: { key: 'confirm', data: testResults } })
    }
  }

  const isSavable = useMemo(() => {
    const { name, country, baseUrl, sectionUrl, headlineSelector, articleSelector } =
      state.sourceData
    return (
      name &&
      country &&
      baseUrl &&
      sectionUrl &&
      headlineSelector?.length > 0 &&
      articleSelector?.length > 0
    )
  }, [state.sourceData])

  const currentAnalysis = state.analysisData[state.activeTabId]
  const currentHtml = state.htmlData[state.activeTabId]

  return (
    <div className="grid grid-cols-[1fr_380px] h-full border-l">
      <div className="flex flex-col h-full">
        <TabsBar
          tabs={state.tabs}
          activeTabId={state.activeTabId}
          onSelectTab={(id) => dispatch({ type: 'SET_ACTIVE_TAB', payload: id })}
          onCloseTab={(id) => dispatch({ type: 'CLOSE_TAB', payload: id })}
        />
        <AnimatePresence mode="wait">
          <motion.div
            key={state.activeTabId}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-grow min-h-0 bg-background"
          >
            {activeTab?.type === 'discovery' && (
              <AnalysisPanel
                analysis={currentAnalysis}
                onSetSelector={(selector) => handleSetSelector([selector])}
                onDrillDown={handleDrillDown}
                activeHeadlineSelector={(state.sourceData.headlineSelector || [])[0]}
              />
            )}
            {activeTab?.type === 'article' && (
              <ArticleExtractorView
                articleHtml={currentHtml}
                onSetSelector={(selectors) =>
                  handleSetSelector(selectors, 'articleSelector')
                }
                value={state.sourceData.articleSelector}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="border-l bg-card h-full">
        <SourceDefinitionPanel
          sourceData={state.sourceData}
          onDataChange={handleDataChange}
          onTest={handleTest}
          onUpdate={() => dispatch({ type: 'SET_MODAL', payload: { key: 'confirm' } })}
          isSaving={state.loadingStates.isSaving}
          countries={allCountries}
          isSavable={isSavable}
        />
      </div>
      <ConfirmationModal
        open={state.modalState.key === 'confirm'}
        onOpenChange={() => dispatch({ type: 'SET_MODAL', payload: { key: null } })}
        onConfirm={handleSave}
        testResults={state.modalState.data}
        isTesting={state.loadingStates.isTesting}
        isSaving={state.loadingStates.isSaving}
        sourceConfig={state.sourceData}
      />
    </div>
  )
}
