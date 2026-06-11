import React from "react";


export default function MessageItem(
	props)
{
	const item = props.item;
	const message = item.message || item.title || item.displayURL || item.url || "Untitled";

	return <div className="results-list-item message"
		style={props.style}
		title={item.tooltip}
	>
		<div className="title"
			style={{ backgroundImage: "url(" + item.faviconURL + ")" }}
		>
			{message}
		</div>
	</div>
}
