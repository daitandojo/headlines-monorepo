// packages/models/src/index.js
// This file is the core, shared module for the models package.
// It exports all Mongoose models and is environment-agnostic.

import Article from './Article.js'
import Country from './Country.js'
import EntityGraph from './EntityGraph.js' // ADDED
import Feedback from './Feedback.js'
import Opportunity from './Opportunity.js'
import PushSubscription from './PushSubscription.js'
import RunVerdict from './RunVerdict.js'
import Setting from './Setting.js'
import Source from './Source.js'
import SourceSuggestion from './SourceSuggestion.js'
import Subscriber from './Subscriber.js'
import SynthesizedEvent from './SynthesizedEvent.js'
import WatchlistEntity from './WatchlistEntity.js'
import WatchlistSuggestion from './WatchlistSuggestion.js'

export {
  Article,
  Country,
  EntityGraph, // ADDED
  Feedback,
  Opportunity,
  PushSubscription,
  RunVerdict,
  Setting,
  Source,
  SourceSuggestion,
  Subscriber,
  SynthesizedEvent,
  WatchlistEntity,
  WatchlistSuggestion,
}
