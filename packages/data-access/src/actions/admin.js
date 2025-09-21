// packages/data-access/src/actions/admin.js (version 2.2.4 - Complete & Correct)
'use server'

import { Subscriber, Country, Source } from '@headlines/models'
import dbConnect from '../dbConnect.js'
import { revalidatePath } from '../revalidate.js'

// --- SUBSCRIBER (USER) ACTIONS ---

export async function createSubscriber(userData) {
  try {
    await dbConnect()
    const newUser = new Subscriber(userData)
    await newUser.save()
    await revalidatePath('/admin/users')
    return { success: true, subscriber: JSON.parse(JSON.stringify(newUser)) }
  } catch (e) {
    if (e.code === 11000) {
      return { success: false, error: 'A user with this email already exists.' }
    }
    return { success: false, error: 'Failed to create subscriber.' }
  }
}

export async function updateSubscriber(userId, updateData) {
  try {
    await dbConnect()
    if (updateData.password === '') {
      delete updateData.password
    }
    const user = await Subscriber.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean()
    if (!user) {
      return { success: false, error: 'User not found.' }
    }
    await revalidatePath('/admin/users')
    return { success: true, subscriber: JSON.parse(JSON.stringify(user)) }
  } catch (e) {
    console.error('[updateSubscriber Error]', e)
    return { success: false, error: 'Failed to update subscriber.' }
  }
}

export async function deleteSubscriber(userId) {
  try {
    await dbConnect()
    const result = await Subscriber.findByIdAndDelete(userId)
    if (!result) {
      return { success: false, error: 'User not found.' }
    }
    await revalidatePath('/admin/users')
    return { success: true }
  } catch (e) {
    console.error('[deleteSubscriber Error]', e)
    return { success: false, error: 'Failed to delete subscriber.' }
  }
}

// --- COUNTRY ACTIONS ---

export async function createCountry(countryData) {
  try {
    await dbConnect()
    const newCountry = new Country(countryData)
    await newCountry.save()
    await revalidatePath('/admin/countries')
    return { success: true, country: JSON.parse(JSON.stringify(newCountry)) }
  } catch (e) {
    if (e.code === 11000) return { success: false, error: 'Country already exists.' }
    return { success: false, error: 'Failed to create country.' }
  }
}

export async function updateCountry(countryId, updateData) {
  try {
    await dbConnect()
    const country = await Country.findByIdAndUpdate(
      countryId,
      { $set: updateData },
      { new: true }
    ).lean()
    if (!country) {
      return { success: false, error: 'Country not found.' }
    }
    await revalidatePath('/admin/countries')
    return { success: true, country: JSON.parse(JSON.stringify(country)) }
  } catch (e) {
    return { success: false, error: 'Failed to update country.' }
  }
}

// --- SOURCE ACTIONS ---

export async function createSource(sourceData) {
  try {
    await dbConnect()
    const newSource = new Source(sourceData)
    await newSource.save()
    await revalidatePath('/admin/scraper-ide')
    return { success: true, source: JSON.parse(JSON.stringify(newSource)) }
  } catch (e) {
    if (e.code === 11000)
      return { success: false, error: 'A source with this name already exists.' }
    return { success: false, error: 'Failed to create source.' }
  }
}

export async function updateSource(sourceId, updateData) {
  try {
    await dbConnect()
    const updatedSource = await Source.findByIdAndUpdate(
      sourceId,
      { $set: updateData },
      { new: true }
    ).lean()
    if (!updatedSource) {
      return { success: false, error: 'Source not found.' }
    }
    await revalidatePath('/admin/scraper-ide')
    return { success: true, source: JSON.parse(JSON.stringify(updatedSource)) }
  } catch (e) {
    return { success: false, error: 'Failed to update source.' }
  }
}
