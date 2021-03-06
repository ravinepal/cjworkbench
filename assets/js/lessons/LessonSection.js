import React from 'react'
import PropTypes from 'prop-types'
import LessonStep from './LessonStep'

export default class LessonSection extends React.PureComponent {
  _stepStatus(stepIndex) {
    const { activeSectionIndex, activeStepIndex } = this.props
    const sectionIndex = this.props.index

    const { FUTURE, ACTIVE, DONE } = LessonStep.Status

    if (activeSectionIndex === null || activeStepIndex === null) {
      return DONE
    } else if (sectionIndex > activeSectionIndex) {
      return FUTURE
    } else if (sectionIndex < activeSectionIndex) {
      return DONE
    } else {
      // sectionIndex === activeSectionIndex
      if (stepIndex > activeStepIndex) {
        return FUTURE
      } else if (stepIndex < activeStepIndex) {
        return DONE
      } else {
        return ACTIVE
      }
    }
  }

  renderStep(step, index) {
    const status = this._stepStatus(index)

    return (
      <LessonStep key={index} html={step.html} status={status} />
    )
  }

  renderSteps(steps) {
    if (steps.length === 0) {
      return null
    } else {
      return (
        <div className="instructions t-white">
          <h3 className="instructions">Instructions</h3>
          <ol className="steps lesson-content--1">
            {steps.map((s, i) => this.renderStep(s, i))}
          </ol>
        </div>
      )
    }
  }

  render() {
    const { isCurrent, title, html, steps } = this.props

    return (
      <section className={ isCurrent ? 'current' : 'not-current' }>
        <a href='/lessons/' className="backToLessons info-1">LESSONS</a>
        <h2>{title}</h2>
        <div className="description lesson-content--1" dangerouslySetInnerHTML={({__html: html})}></div>
        { this.renderSteps(steps) }
      </section>
    )
  }
}

LessonSection.propTypes = {
  title: PropTypes.string.isRequired,
  html: PropTypes.string.isRequired,
  steps: PropTypes.arrayOf(PropTypes.shape({
    html: PropTypes.string.isRequired,
  })).isRequired,
  isCurrent: PropTypes.bool.isRequired,
  index: PropTypes.number.isRequired, // to compare with activeSectionIndex
  activeSectionIndex: PropTypes.number, // or null
  activeStepIndex: PropTypes.number, // or null
}
