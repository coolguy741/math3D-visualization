import Folder from './components/Folder'
import { connect } from 'react-redux'
import {
  toggleContentCollapsed
} from './actions'
import { getItems } from './selectors'

const mapStateToProps = (state, ownProps) => ( {
  items: getItems(state, ownProps.id),
  isCollapsed: state.folders[ownProps.id].isCollapsed,
  isActive: state.activeObject === ownProps.id
} )

const mapDispatchToProps = {
  onToggleContentCollapsed: toggleContentCollapsed
}

export default connect(mapStateToProps, mapDispatchToProps)(Folder)
