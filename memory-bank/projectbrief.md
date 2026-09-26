# Project Brief

## Project and context source

This repository is 4Geeks Academy's cross-cutting AI Engineering project for **HealthCore**. The primary source of truth for the business is [`CONTEXT.es.md`](../CONTEXT.es.md). The project must preserve the separation between business context, technical implementation, and milestone-based evolution.

## What HealthCore is

HealthCore is an outpatient healthcare company founded in 2011 in Austin, Texas. It operates 12 clinics: 9 in the United States and 3 in the United Kingdom. It offers primary care, specialist consultations, chronic disease management, and preventive health programs. It has approximately 200 employees and annual revenue of about 28 million dollars.

The company is organized into Clinical Operations, Patient Experience and Access, Revenue Cycle and Billing, Compliance and Data Governance, People and Workforce, Technology, and Executive Leadership. The internal **HealthCore Digital** unit builds systems, workflows, and intelligent tools to modernize operations.

## Problem the project addresses

HealthCore operates legacy systems that do not communicate properly: two EHR platforms, country-specific billing, telephone booking, and no shared data layer. This makes coordination across sites and countries, operational visibility, and decision-making more difficult.

The project aims to provide interfaces and services that make HealthCore's processes more accessible and consistent while respecting HIPAA and UK GDPR obligations. Business needs include improving access and appointments, clinical operations, billing, compliance, people management, and executive information.

## Users and areas

- Patients and prospects who need information and contact with HealthCore.
- Clinical staff and Clinical Operations, led by Dr. Marcus Reid.
- Patient Experience and Access, led by Priya Nair.
- Revenue Cycle and Billing, led by Tom Callahan.
- Compliance and Data Governance, led by Claire Whitfield.
- People and Workforce, led by Diane Foster.
- Technology, led by James Osei.
- Executive Leadership, led by Dr. Sandra Okonkwo.

## General objectives

- Build secure, patient-centered digital solutions.
- Reduce information fragmentation across clinics, countries, and departments.
- Facilitate operations and decision-making with more accessible information.
- Evolve the monorepo with separate responsibilities for public interfaces, internal tools, and services.

## Purpose of the Milestone 4 architecture

- **`/uis/website`**: HealthCore's public web presence for patients and prospects. The previous Milestone 1—static landing page and form in the root—is the predecessor for this responsibility.
- **`/uis/backoffice`**: internal application for administrative and operational capabilities. Talent Pipeline Tracker is a previous implementation related to People and Workforce and can be reused as prior work for this responsibility.
- **`/services`**: space for backend services supporting HealthCore's interfaces and processes. Its concrete implementation and technologies must be based on Milestone 4 requirements; no implementation that does not yet exist is declared here.

Milestone 1 and Talent Pipeline Tracker are relevant prior work, not the primary focus of Milestone 4.
