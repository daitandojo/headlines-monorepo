// packages/ai-services/src/chains/articleChain.js (version 2.4 - Confirmed Final)
import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate,
} from '@langchain/core/prompts'
import { AIMessage, HumanMessage } from '@langchain/core/messages'
import { JsonOutputParser } from '@langchain/core/output_parsers'
import { RunnableSequence } from '@langchain/core/runnables'
import { settings } from '@headlines/config/server'
import {
  getInstructionArticle,
  shotsInputArticle,
  shotsOutputArticle,
} from '@headlines/prompts'
import { getHighPowerModel } from '../lib/langchain.js'
import { safeInvoke } from '../lib/safeInvoke.js'
import { logger } from '@headlines/utils/server';
import { articleAssessmentSchema } from '../schemas/index.js'

const instructions = getInstructionArticle(settings)
const systemPrompt = [
  instructions.whoYouAre,
  instructions.whatYouDo,
  instructions.primaryMandate,
  instructions.analyticalFramework,
  instructions.scoring,
  instructions.outputFormatDescription,
  instructions.reiteration,
].join('\n\n')

const messages = [
  SystemMessagePromptTemplate.fromTemplate(systemPrompt),
  ...shotsInputArticle.flatMap((input, i) => [
    new HumanMessage(input),
    new AIMessage(shotsOutputArticle[i]),
  ]),
  HumanMessagePromptTemplate.fromTemplate('{article_text}'),
]

const prompt = ChatPromptTemplate.fromMessages(messages)
const chain = RunnableSequence.from([prompt, getHighPowerModel(), new JsonOutputParser()])

async function invoke(input) {
  const result = await safeInvoke(chain, input, 'articleChain', articleAssessmentSchema)
  if (result.error) return result
  if (result.key_individuals?.length > 0) {
    const articleTextLower = input.article_text.toLowerCase()
    result.key_individuals = result.key_individuals.filter((ind) => {
      if (!ind.name) return false
      const isPresent = ind.name
        .split(' ')
        .filter((p) => p.length > 2)
        .some((p) => articleTextLower.includes(p.toLowerCase()))
      if (!isPresent)
        logger.warn({ individual: ind.name }, 'Discarding hallucinated key individual.')
      return isPresent
    })
  }
  return result
}

export const articleChain = { invoke }
